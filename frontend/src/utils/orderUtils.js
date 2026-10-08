/**
 * Reusable Order Utilities for EcoNext.
 *
 * Normalizes and compares order identifiers across all customer flows:
 *   - 'ORD-00088' -> '88'
 *   - 'ORD-88'    -> '88'
 *   - '#88'       -> '88'
 *   - '88'        -> '88'
 *   - 88          -> '88'
 */

/**
 * Safely normalizes any order identifier string or number into a canonical comparable ID.
 * @param {string|number} raw - The raw order identifier
 * @returns {string} Normalized order ID string (e.g. '88')
 */
export const normalizeOrderId = (raw) => {
  if (raw === null || raw === undefined) return '';
  const str = String(raw).trim();
  if (!str) return '';

  if (/^ORD-\d{8}-\d{4}$/i.test(str)) {
    return str.toUpperCase();
  }

  // Strip hash prefix '#', 'ORD-', 'ord-', 'ORD', 'ord', and leading zeros from the numeric part
  let cleaned = str.replace(/^#+/, '').trim();
  cleaned = cleaned.replace(/^ORD[-_]?0*/i, '').trim();
  cleaned = cleaned.replace(/^0+/, '').trim();

  return cleaned || str;
};

/**
 * Formats an order identifier into the canonical display representation e.g. ORD-YYYYMMDD-XXXX or ORD-00088.
 * @param {string|number} raw - The raw order identifier
 * @returns {string} Formatted canonical display string
 */
export const formatOrderReference = (raw) => {
  if (raw === null || raw === undefined || raw === '') return '';
  const str = String(raw).trim();
  if (/^ORD-\d{8}-\d{4}$/i.test(str)) {
    return str.toUpperCase();
  }
  const norm = normalizeOrderId(raw);
  if (/^\d+$/.test(norm)) {
    return `ORD-${norm.padStart(5, '0')}`;
  }
  return str.toUpperCase().startsWith('ORD-') ? str : `ORD-${str}`;
};

/**
 * Checks if two order identifiers (or order objects) refer to the same order.
 * Handles variations like 'ORD-20261009-0001' vs 'ORD-00088' vs 88 vs { id: 88, order_number: 'ORD-20261009-0001' }.
 * @param {string|number|object} orderOrIdA
 * @param {string|number|object} orderOrIdB
 * @returns {boolean} True if they match
 */
export const matchesOrderId = (orderOrIdA, orderOrIdB) => {
  if (!orderOrIdA || !orderOrIdB) return false;

  const getCandidates = (val) => {
    if (typeof val === 'object' && val !== null) {
      const list = [];
      if (val.id !== undefined && val.id !== null) list.push(String(val.id));
      if (val.order_number) list.push(String(val.order_number));
      if (val.order_reference_number) list.push(String(val.order_reference_number));
      if (val.rawOrderId) list.push(String(val.rawOrderId));
      if (val.orderId) list.push(String(val.orderId));
      return list;
    }
    return [String(val)];
  };

  const listA = getCandidates(orderOrIdA);
  const listB = getCandidates(orderOrIdB);

  for (const a of listA) {
    const normA = normalizeOrderId(a).toLowerCase();
    const rawA = a.trim().toLowerCase();

    for (const b of listB) {
      const normB = normalizeOrderId(b).toLowerCase();
      const rawB = b.trim().toLowerCase();

      if (normA && normB && normA === normB) return true;
      if (rawA === rawB) return true;
      if (`ord-${rawA}` === rawB || `ord-${rawB}` === rawA) return true;
      if (`#${rawA}` === rawB || `#${rawB}` === rawA) return true;
    }
  }

  return false;
};
