use olist_analytics;

// Drop collections if they already exist to start fresh
db.customers.drop();
db.products.drop();
db.orders.drop();

// 1. Customers Collection
db.createCollection("customers", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["customer_id", "customer_unique_id", "customer_zip_code_prefix", "customer_city", "customer_state"],
      properties: {
        customer_id: { bsonType: "string" },
        customer_unique_id: { bsonType: "string" },
        customer_zip_code_prefix: { bsonType: "int" },
        customer_city: { bsonType: "string" },
        customer_state: { bsonType: "string" }
      }
    }
  }
});

// 2. Products Collection
db.createCollection("products", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["product_id"],
      properties: {
        product_id: { bsonType: "string" },
        product_category_name: { bsonType: ["string", "null"] },
        product_category_name_english: { bsonType: ["string", "null"] },
        product_weight_g: { bsonType: ["double", "int", "null"] },
        product_length_cm: { bsonType: ["double", "int", "null"] },
        product_height_cm: { bsonType: ["double", "int", "null"] },
        product_width_cm: { bsonType: ["double", "int", "null"] }
      }
    }
  }
});

// 3. Orders Collection (with embedded Items and Reviews)
db.createCollection("orders", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["order_id", "customer_id", "order_status", "order_purchase_timestamp", "items"],
      properties: {
        order_id: { bsonType: "string" },
        customer_id: { bsonType: "string" },
        order_status: { bsonType: "string" },
        order_purchase_timestamp: { bsonType: "date" },
        order_approved_at: { bsonType: ["date", "null"] },
        order_delivered_carrier_date: { bsonType: ["date", "null"] },
        order_delivered_customer_date: { bsonType: ["date", "null"] },
        order_estimated_delivery_date: { bsonType: "date" },
        items: {
          bsonType: "array",
          items: {
            bsonType: "object",
            required: ["order_item_id", "product_id", "price", "freight_value"],
            properties: {
              order_item_id: { bsonType: "int" },
              product_id: { bsonType: "string" },
              seller_id: { bsonType: "string" },
              price: { bsonType: "double" },
              freight_value: { bsonType: "double" }
            }
          }
        },
        reviews: {
          bsonType: "array",
          items: {
            bsonType: "object",
            required: ["review_score"],
            properties: {
              review_id: { bsonType: "string" },
              review_score: { bsonType: "int" },
              review_creation_date: { bsonType: "date" }
            }
          }
        }
      }
    }
  }
});

print("Database and Collections created with Schema Validation successfully!");