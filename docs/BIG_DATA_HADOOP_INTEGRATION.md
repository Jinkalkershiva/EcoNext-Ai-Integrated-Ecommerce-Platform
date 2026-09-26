# EcoNext — Big Data & Apache Hadoop Integration Architecture

This document describes the end-to-end Big Data streaming, ingestion, storage, and analytical architecture implemented across the EcoNext E-Commerce platform.

---

## 1. Architectural Overview & Data Flow

```
[ Customer Web Store ] ---> [ Django Backend ] ---\
                                                   +---> [ Apache Kafka Cluster ]
[ Operations System  ] ---> [ Spring Boot APIs] ---/     (KRaft Broker : 9092)
                                                                 |
                                                                 v
                                                      [ Spark Structured Streaming ]
                                                                 |
                                                                 v
                                                      [ Apache Hadoop HDFS Data Lake ]
                                                      (hdfs://localhost:9000/econext/)
                                                                 |
               +-------------------------------------------------+-------------------------+
               |                                                 |                         |
               v                                                 v                         v
        /econext/raw/                                   /econext/processed/        /econext/analytics/
 (Date Partitioned Raw Stream)                    (Columnar Parquet Datasets)   (Compacted Aggregates & ML)
               |                                                 |                         |
               +-------------------------------------------------+-------------------------+
                                                                 |
                                                                 v
                                                    [ Spring Boot Analytics Engine ]
                                                                 |
                                                                 v
                                                    [ Admin Big Data Telemetry UI ]
```

---

## 2. Kafka Topics & Ingestion Schema

| Topic Name | Producer Source | Partition Key | Payload Description | HDFS Sink Path |
| :--- | :--- | :--- | :--- | :--- |
| `user-search-events` | Django / Search API | `userId` | Search queries, filters, result count, clicked items | `/econext/raw/user_search_events/` |
| `product-view-events` | Django / React Store | `productId` | Product views, category, session dwell time | `/econext/raw/product_view_events/` |
| `cart-events` | Spring Boot Cart / App | `userId` | Add, update quantity, remove, abandoned cart | `/econext/raw/cart_events/` |
| `order-events` | Spring Boot Order Service | `orderId` | Order placement, payment, 10-stage lifecycle updates | `/econext/raw/order_events/` |
| `inventory-events` | Spring Boot Catalog Service | `sku` | Real-time stock decrements, low-stock threshold triggers | `/econext/raw/inventory_events/` |

---

## 3. HDFS Partitioning Strategy & Data Lake Layers

### Layer 1: Raw Layer (`/econext/raw/*`)
- **Format**: Parquet or JSON GZIP
- **Partitioning**: `year=YYYY / month=MM / day=DD /`
- **Retention**: 90 Days active retention; archived to cold tier thereafter.
- **Guarantee**: Preserves full event history with original timestamps, trace IDs, and raw payloads.

### Layer 2: Processed Layer (`/econext/processed/*`)
- **Format**: Apache Parquet with Snappy compression.
- **Partitioning**: `year=YYYY / month=MM /`
- **Schemas**: Cleaned, schema-enforced dimensional tables (`fact_customer_sessions`, `fact_order_lifecycle`).

### Layer 3: Analytics Layer (`/econext/analytics/*`)
- **Format**: Parquet / Aggregated Tables.
- **Datasets**:
  - `search_trends_daily`: Search volume, zero-result keywords, search-to-cart conversion.
  - `sustainability_conversion_daily`: Correlation between product Eco-Scores and purchasing velocity.
  - `agg_daily_demand_forecast`: AI/ML trained demand predictions for inventory replenishment.

---

## 4. Kali VM / Distributed Node Cluster Topology

For production distributed cluster deployments (including VMware/VirtualBox Kali Linux / Ubuntu nodes):

### Node Roles & Network Bindings
| Node Host | Role | Open Ports | Memory Allocation |
| :--- | :--- | :--- | :--- |
| **Master Node (NameNode)** | HDFS NameNode, YARN ResourceManager, Spark Master | `9000` (IPC), `9870` (Web UI), `8088` (YARN), `7077` (Spark) | 8 GB RAM / 4 vCPUs |
| **Worker Node 1 (DataNode)** | HDFS DataNode, NodeManager, Spark Worker | `9864` (DataNode UI), `8042` (NodeManager) | 4 GB RAM / 2 vCPUs |
| **Worker Node 2 (DataNode)** | HDFS DataNode, NodeManager, Spark Worker | `9864` (DataNode UI), `8042` (NodeManager) | 4 GB RAM / 2 vCPUs |
| **Kafka Broker Host** | Kafka KRaft Broker | `9092` (Broker), `8088` (Kafka-UI) | 4 GB RAM / 2 vCPUs |

### Configuration Properties (`hdfs-site.xml` & `core-site.xml`)
```xml
<!-- core-site.xml -->
<configuration>
    <property>
        <name>fs.defaultFS</name>
        <value>hdfs://192.168.1.150:9000</value>
    </property>
</configuration>

<!-- hdfs-site.xml -->
<configuration>
    <property>
        <name>dfs.replication</name>
        <value>2</value>
    </property>
    <property>
        <name>dfs.namenode.name.dir</name>
        <value>/var/hadoop/hdfs/namenode</value>
    </property>
    <property>
        <name>dfs.datanode.data.dir</name>
        <value>/var/hadoop/hdfs/datanode</value>
    </property>
</configuration>
```

---

## 5. Non-Blocking Invariant & High Availability

- **Transactional Invariant**: CRUD operations on MySQL (Catalog, Inventory, Orders) and customer transactions are strictly decoupled from Big Data ingestion.
- **Fail-Safe Mechanism**: If Kafka or HDFS becomes temporarily unreachable, Spring Boot microservices and Django log warnings asynchronously without raising exceptions or degrading response times to end-users or operational staff.
- **Admin Visibility**: Operational staff can monitor real-time ingestion rates, pause/resume streaming data sources, and trigger test payloads directly from the Admin Big Data Telemetry Panel.
