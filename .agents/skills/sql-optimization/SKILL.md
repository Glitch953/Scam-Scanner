---
name: sql-optimization
description: Use when debugging slow SQL queries, designing database indexes, or rewriting queries for better performance. For EXPLAIN analysis, index strategy, N+1 problem resolution, and query optimization patterns.
---

# SQL Optimization

Master SQL query performance through systematic analysis, strategic indexing, and proven optimization patterns.

## Overview

This skill helps you diagnose and fix slow database queries. It covers:
1. **Diagnose**: Identify bottlenecks with EXPLAIN analysis
2. **Optimize**: Design effective indexes and rewrite inefficient queries
3. **Validate**: Measure improvements and monitor performance

## When to Use This Skill

- **Slow Query Debugging**: Query taking too long, need to find the bottleneck
- **Index Design**: Creating indexes to speed up queries
- **Query Rewriting**: Transforming inefficient SQL into optimized versions
- **N+1 Problem**: ORM generating too many queries
- **Pagination Optimization**: Large offset queries slowing down

### Example Triggers

- "My query is slow, how do I debug it?"
- "What indexes should I create for this table?"
- "How do I fix N+1 queries in my ORM?"
- "What's wrong with my EXPLAIN output?"
- "How do I optimize pagination for large datasets?"

---

## Core Methodology

### Step 1: Analyze Query Performance

1. Identify slow queries from logs or monitoring
2. Run `EXPLAIN ANALYZE` to see execution plan
3. Measure actual query execution time
4. Check resource utilization (CPU, I/O, memory)

### Step 2: Understand Execution Plans

| Warning Sign | Meaning | Action |
|--------------|---------|--------|
| `Seq Scan` | Full table scan | Add appropriate index |
| `Nested Loop` on large tables | Inefficient join | Check join conditions |
| High `rows removed by filter` | Index not selective | Use more specific index |
| `Sort` with high cost | Sorting in memory | Add index with ORDER BY columns |

### Step 3: Apply Optimizations

1. Design appropriate indexes (see Index Strategies)
2. Rewrite inefficient queries (see Query Patterns)
3. Optimize join order
4. Consider denormalization for read-heavy workloads

### Step 4: Validate Improvements

- Compare before/after execution times
- Test with production-like data volumes
- Verify query correctness (same results)
- Monitor after deployment

---

## Index Strategies

### Single Column Index
For simple equality checks:
```sql
CREATE INDEX idx_users_email ON users(email);
```

### Composite Index
For multiple conditions - order matters!
```sql
-- Rule: Equality first, then range, then sort
CREATE INDEX idx_orders_user_status_date
ON orders(user_id, status, created_at DESC);
```

### Partial Index
For filtered subsets:
```sql
CREATE INDEX idx_orders_pending
ON orders(created_at DESC)
WHERE status = 'pending';
```

### Covering Index
Avoid table lookups entirely:
```sql
CREATE INDEX idx_orders_summary
ON orders(user_id, status)
INCLUDE (total, created_at);
```

### Expression Index
For computed conditions:
```sql
CREATE INDEX idx_users_email_lower ON users(LOWER(email));
```

### Index Maintenance

Check existing indexes:
```sql
SELECT indexname, indexdef,
       pg_size_pretty(pg_relation_size(indexname::regclass)) AS size
FROM pg_indexes WHERE tablename = 'orders';
```

Find unused indexes:
```sql
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;
```

---

## Query Optimization Patterns

### Pattern 1: Replace Subquery with JOIN

```sql
-- ❌ Before: Subquery
SELECT * FROM orders
WHERE customer_id IN (SELECT id FROM customers WHERE region = 'US');

-- ✅ After: JOIN
SELECT o.* FROM orders o
INNER JOIN customers c ON o.customer_id = c.id
WHERE c.region = 'US';
```

### Pattern 2: EXISTS vs IN

```sql
-- ❌ Before: IN with large subquery
SELECT * FROM products
WHERE id IN (SELECT product_id FROM order_items);

-- ✅ After: EXISTS (stops at first match)
SELECT * FROM products p
WHERE EXISTS (
    SELECT 1 FROM order_items oi WHERE oi.product_id = p.id
);
```

### Pattern 3: Avoid Functions on Indexed Columns

```sql
-- ❌ Before: Function prevents index use
SELECT * FROM users WHERE YEAR(created_at) = 2024;

-- ✅ After: Range condition uses index
SELECT * FROM users
WHERE created_at >= '2024-01-01' AND created_at < '2025-01-01';
```

### Pattern 4: Keyset Pagination

```sql
-- ❌ Before: OFFSET is slow for large values
SELECT * FROM products ORDER BY id LIMIT 20 OFFSET 10000;

-- ✅ After: Keyset pagination is O(1)
SELECT * FROM products
WHERE id > 10000
ORDER BY id LIMIT 20;
```

### Pattern 5: Batch Operations

```sql
-- ❌ Before: Row-by-row updates
UPDATE products SET price = price * 1.1 WHERE id = 1;
UPDATE products SET price = price * 1.1 WHERE id = 2;
-- ... repeated 1000 times

-- ✅ After: Single batch update
UPDATE products SET price = price * 1.1
WHERE id = ANY(ARRAY[1, 2, 3, ..., 1000]);
```

---

## Solving N+1 Queries

### The Problem

```python
# Application code generates N+1 queries:
orders = SELECT * FROM orders WHERE user_id = 1   # 1 query
for order in orders:
    items = SELECT * FROM order_items WHERE order_id = order.id  # N queries
```

### Solution 1: JOIN Everything

```sql
SELECT o.id AS order_id, o.total, o.created_at,
       oi.product_id, oi.quantity, oi.unit_price,
       p.name AS product_name
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
LEFT JOIN products p ON oi.product_id = p.id
WHERE o.user_id = 1
ORDER BY o.created_at DESC, oi.id;
```

### Solution 2: Batch Query

```sql
-- Query 1: Get orders
SELECT * FROM orders WHERE user_id = 1;
-- Returns order IDs: [1, 2, 3, 4, 5]

-- Query 2: Batch get items
SELECT * FROM order_items WHERE order_id IN (1, 2, 3, 4, 5);
```

---

## EXPLAIN Analysis Guide

### Running EXPLAIN

```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT o.*, c.name, c.email
FROM orders o
INNER JOIN customers c ON o.customer_id = c.id
WHERE o.status = 'pending'
AND o.created_at > '2024-01-01'
ORDER BY o.created_at DESC;
```

### Reading the Output

```
Seq Scan on orders  (cost=0.00..15420.00 rows=50000)
  Filter: (status = 'pending' AND created_at > '2024-01-01')
  Rows Removed by Filter: 450000
```

**Problems identified**:
- `Seq Scan` = No index used, scanning all rows
- `Rows Removed by Filter: 450000` = 90% of rows discarded

**Solution**:
```sql
CREATE INDEX idx_orders_status_created
ON orders(status, created_at DESC)
WHERE status IN ('pending', 'processing');
```

**After optimization**:
```
Index Scan using idx_orders_status_created (cost=0.42..125.50 rows=100)
```
Result: 99% reduction in query time!

---

## Best Practices

1. **Index Strategically**: Focus on WHERE, JOIN, and ORDER BY columns
2. **Avoid SELECT ***: Select only columns you need
3. **Use EXPLAIN**: Always analyze execution plans before and after
4. **Limit Results**: Use pagination for large datasets
5. **Avoid N+1**: Use JOINs or batch queries
6. **Consider Caching**: Cache frequently accessed, rarely changed data
7. **Monitor Continuously**: Track query performance over time

---

## Quick Reference

| Problem | Solution |
|---------|----------|
| Slow query | Run EXPLAIN ANALYZE, add index |
| Full table scan | Create index on filter columns |
| N+1 queries | Use JOIN or batch query |
| Slow pagination | Use keyset pagination |
| Function on column | Rewrite as range condition |
| Large subquery | Replace IN with EXISTS or JOIN |
