package com.olist.analytics;

import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import com.mongodb.client.model.InsertManyOptions;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.bson.Document;

import java.io.File;
import java.io.FileInputStream;
import java.io.InputStreamReader;
import java.io.Reader;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class OlistIngestionPipeline {
    private static final String CONNECTION_STRING = "mongodb://localhost:27017";
    private static final String DATABASE_NAME = "olist_analytics";
    private static final String DATA_PATH = "E:/Olist-project/data/";
    private static final int BATCH_SIZE = 5000;
    private static final SimpleDateFormat DATE_FORMAT = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");

    public static void main(String[] args) {
        try (MongoClient mongoClient = MongoClients.create(CONNECTION_STRING)) {
            MongoDatabase database = mongoClient.getDatabase(DATABASE_NAME);

            System.out.println("Starting Ingestion Process...");
            ingestCustomers(database);

            Map<String, String> translations = loadCategoryTranslations();
            ingestProducts(database, translations);
            ingestOrdersWithEmbeddings(database);

            System.out.println("All data ingested successfully!");
        } catch (Exception e) {
            System.err.println("Pipeline failed: " + e.getMessage());
            e.printStackTrace();
        }
    }

    private static String cleanVal(String val) {
        if (val == null) return "";
        return val.replace("\uFEFF", "").trim();
    }

    private static Date parseDate(String val) {
        String clean = cleanVal(val);
        if (clean.isEmpty()) return null;
        try {
            return DATE_FORMAT.parse(clean);
        } catch (Exception e) {
            return null;
        }
    }

    private static Double parseDouble(String val) {
        String clean = cleanVal(val);
        if (clean.isEmpty()) return 0.0;
        try {
            return Double.parseDouble(clean);
        } catch (Exception e) {
            return 0.0;
        }
    }

    private static Integer parseInt(String val) {
        String clean = cleanVal(val);
        if (clean.isEmpty()) return 0;
        try {
            return Integer.parseInt(clean);
        } catch (Exception e) {
            return 0;
        }
    }

    private static CSVParser createParser(File file) throws Exception {
        Reader reader = new InputStreamReader(new FileInputStream(file), StandardCharsets.UTF_8);
        return CSVFormat.DEFAULT.builder()
                .setHeader()
                .setSkipHeaderRecord(true)
                .setIgnoreHeaderCase(true)
                .setTrim(true)
                .build()
                .parse(reader);
    }

    private static void ingestCustomers(MongoDatabase db) throws Exception {
        MongoCollection<Document> collection = db.getCollection("customers");
        File file = new File(DATA_PATH + "olist_customers_dataset.csv");
        if (!file.exists()) {
            System.err.println("File not found: " + file.getAbsolutePath());
            return;
        }

        try (CSVParser parser = createParser(file)) {
            List<Document> batch = new ArrayList<>();
            int total = 0;
            for (CSVRecord record : parser) {
                Document doc = new Document("customer_id", cleanVal(record.get(0)))
                        .append("customer_unique_id", cleanVal(record.get(1)))
                        .append("customer_zip_code_prefix", parseInt(record.get(2)))
                        .append("customer_city", cleanVal(record.get(3)))
                        .append("customer_state", cleanVal(record.get(4)));
                batch.add(doc);

                if (batch.size() >= BATCH_SIZE) {
                    collection.insertMany(batch, new InsertManyOptions().ordered(false));
                    total += batch.size();
                    batch.clear();
                }
            }
            if (!batch.isEmpty()) {
                collection.insertMany(batch, new InsertManyOptions().ordered(false));
                total += batch.size();
            }
            System.out.println("Customers Ingested: " + total);
        }
    }

    private static Map<String, String> loadCategoryTranslations() throws Exception {
        Map<String, String> map = new HashMap<>();
        File file = new File(DATA_PATH + "product_category_name_translation.csv");
        if (!file.exists()) {
            System.err.println("File not found: " + file.getAbsolutePath());
            return map;
        }

        try (CSVParser parser = createParser(file)) {
            for (CSVRecord record : parser) {
                if (record.size() >= 2) {
                    map.put(cleanVal(record.get(0)), cleanVal(record.get(1)));
                }
            }
        }
        return map;
    }

    private static void ingestProducts(MongoDatabase db, Map<String, String> translations) throws Exception {
        MongoCollection<Document> collection = db.getCollection("products");
        File file = new File(DATA_PATH + "olist_products_dataset.csv");
        if (!file.exists()) {
            System.err.println("File not found: " + file.getAbsolutePath());
            return;
        }

        try (CSVParser parser = createParser(file)) {
            List<Document> batch = new ArrayList<>();
            int total = 0;
            for (CSVRecord record : parser) {
                String productId = cleanVal(record.get(0));
                String ptCategory = cleanVal(record.get(1));
                String enCategory = translations.getOrDefault(ptCategory, ptCategory);

                Document doc = new Document("product_id", productId)
                        .append("product_category_name", ptCategory.isEmpty() ? null : ptCategory)
                        .append("product_category_name_english", enCategory.isEmpty() ? null : enCategory)
                        .append("product_weight_g", parseDouble(record.get(4)))
                        .append("product_length_cm", parseDouble(record.get(5)))
                        .append("product_height_cm", parseDouble(record.get(6)))
                        .append("product_width_cm", parseDouble(record.get(7)));
                batch.add(doc);

                if (batch.size() >= BATCH_SIZE) {
                    collection.insertMany(batch, new InsertManyOptions().ordered(false));
                    total += batch.size();
                    batch.clear();
                }
            }
            if (!batch.isEmpty()) {
                collection.insertMany(batch, new InsertManyOptions().ordered(false));
                total += batch.size();
            }
            System.out.println("Products Ingested: " + total);
        }
    }

    private static void ingestOrdersWithEmbeddings(MongoDatabase db) throws Exception {
        System.out.println("Buffering order items...");
        Map<String, List<Document>> itemsMap = new HashMap<>();
        File itemFile = new File(DATA_PATH + "olist_order_items_dataset.csv");
        if (itemFile.exists()) {
            try (CSVParser itemParser = createParser(itemFile)) {
                for (CSVRecord record : itemParser) {
                    String orderId = cleanVal(record.get(0));
                    Document itemDoc = new Document("order_item_id", parseInt(record.get(1)))
                            .append("product_id", cleanVal(record.get(2)))
                            .append("seller_id", cleanVal(record.get(3)))
                            .append("price", parseDouble(record.get(5)))
                            .append("freight_value", parseDouble(record.get(6)));
                    itemsMap.computeIfAbsent(orderId, k -> new ArrayList<>()).add(itemDoc);
                }
            }
        }

        System.out.println("Buffering reviews...");
        Map<String, List<Document>> reviewsMap = new HashMap<>();
        File reviewFile = new File(DATA_PATH + "olist_order_reviews_dataset.csv");
        if (reviewFile.exists()) {
            try (CSVParser reviewParser = createParser(reviewFile)) {
                for (CSVRecord record : reviewParser) {
                    String orderId = cleanVal(record.get(1));
                    Document revDoc = new Document("review_id", cleanVal(record.get(0)))
                            .append("review_score", parseInt(record.get(2)))
                            .append("review_creation_date", parseDate(record.get(5)));
                    reviewsMap.computeIfAbsent(orderId, k -> new ArrayList<>()).add(revDoc);
                }
            }
        }

        System.out.println("Ingesting aggregated orders...");
        MongoCollection<Document> collection = db.getCollection("orders");
        File orderFile = new File(DATA_PATH + "olist_orders_dataset.csv");
        if (!orderFile.exists()) {
            System.err.println("File not found: " + orderFile.getAbsolutePath());
            return;
        }

        try (CSVParser orderParser = createParser(orderFile)) {
            List<Document> batch = new ArrayList<>();
            int total = 0;
            for (CSVRecord record : orderParser) {
                String orderId = cleanVal(record.get(0));
                Document doc = new Document("order_id", orderId)
                        .append("customer_id", cleanVal(record.get(1)))
                        .append("order_status", cleanVal(record.get(2)))
                        .append("order_purchase_timestamp", parseDate(record.get(3)))
                        .append("order_approved_at", parseDate(record.get(4)))
                        .append("order_delivered_carrier_date", parseDate(record.get(5)))
                        .append("order_delivered_customer_date", parseDate(record.get(6)))
                        .append("order_estimated_delivery_date", parseDate(record.get(7)))
                        .append("items", itemsMap.getOrDefault(orderId, Collections.emptyList()))
                        .append("reviews", reviewsMap.getOrDefault(orderId, Collections.emptyList()));

                batch.add(doc);
                if (batch.size() >= BATCH_SIZE) {
                    collection.insertMany(batch, new InsertManyOptions().ordered(false));
                    total += batch.size();
                    batch.clear();
                }
            }
            if (!batch.isEmpty()) {
                collection.insertMany(batch, new InsertManyOptions().ordered(false));
                total += batch.size();
            }
            System.out.println("Orders Ingested: " + total);
        }
    }
}