"""
EcoNext Big Data Architecture: Spark Structured Streaming Pipeline
Consumes streaming e-commerce events from Kafka KRaft brokers, validates schemas,
and sinks date-partitioned raw event layers into the HDFS Data Lake (/econext/raw/*).
"""

import os
import sys
from pyspark.sql import SparkSession
from pyspark.sql.functions import from_json, col, current_timestamp, date_format, year, month, dayofmonth, hour
from pyspark.sql.types import StructType, StructField, StringType, DoubleType, LongType, IntegerType, MapType

# Configuration
KAFKA_BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
HDFS_NAMENODE = os.getenv("HDFS_NAMENODE", "hdfs://localhost:9000")
HDFS_BASE_PATH = f"{HDFS_NAMENODE}/econext"

# Standard Envelope Schema
BASE_EVENT_SCHEMA = StructType([
    StructField("eventId", StringType(), True),
    StructField("timestamp", StringType(), True),
    StructField("topic", StringType(), True),
    StructField("data", MapType(StringType(), StringType()), True)
])


def create_spark_session(app_name="EcoNext-KafkaToHDFS-Streaming"):
    return (
        SparkSession.builder
        .appName(app_name)
        .config("spark.streaming.stopGracefullyOnShutdown", "true")
        .config("spark.sql.streaming.schemaInference", "true")
        .config("spark.sql.shuffle.partitions", "4")
        .getOrCreate()
    )


def process_stream_to_hdfs(spark, topic_name):
    print(f"[*] Starting Structured Streaming for topic: {topic_name}")
    raw_kafka_df = (
        spark.readStream
        .format("kafka")
        .option("kafka.bootstrap.servers", KAFKA_BOOTSTRAP_SERVERS)
        .option("subscribe", topic_name)
        .option("startingOffsets", "latest")
        .option("failOnDataLoss", "false")
        .load()
    )

    parsed_df = (
        raw_kafka_df
        .selectExpr("CAST(key AS STRING) as message_key", "CAST(value AS STRING) as json_value")
        .withColumn("payload", from_json(col("json_value"), BASE_EVENT_SCHEMA))
        .select(
            col("message_key"),
            col("payload.eventId").alias("event_id"),
            col("payload.timestamp").alias("event_timestamp"),
            col("payload.topic").alias("event_topic"),
            col("payload.data").alias("event_payload"),
            current_timestamp().alias("ingested_at")
        )
        .withColumn("year", year(col("ingested_at")))
        .withColumn("month", date_format(col("ingested_at"), "MM"))
        .withColumn("day", date_format(col("ingested_at"), "dd"))
        .withColumn("hour", hour(col("ingested_at")))
    )

    sink_path = f"{HDFS_BASE_PATH}/raw/{topic_name.replace('-', '_')}"
    checkpoint_path = f"{HDFS_BASE_PATH}/checkpoints/{topic_name.replace('-', '_')}"

    query = (
        parsed_df.writeStream
        .format("parquet")
        .partitionBy("year", "month", "day")
        .option("path", sink_path)
        .option("checkpointLocation", checkpoint_path)
        .outputMode("append")
        .trigger(processingTime="10 seconds")
        .start()
    )

    return query


def main():
    spark = create_spark_session()
    spark.sparkContext.setLogLevel("WARN")

    topics = [
        "user-search-events",
        "product-view-events",
        "cart-events",
        "order-events",
        "inventory-events"
    ]

    queries = []
    for topic in topics:
        try:
            q = process_stream_to_hdfs(spark, topic)
            queries.append(q)
        except Exception as e:
            print(f"[!] Warning on streaming topic {topic}: {e}", file=sys.stderr)

    print("[+] EcoNext Real-time Spark-to-HDFS ingestion pipeline is active.")
    for q in queries:
        q.awaitTermination()


if __name__ == "__main__":
    main()
