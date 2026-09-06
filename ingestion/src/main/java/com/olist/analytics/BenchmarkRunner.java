package com.olist.analytics;

import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoDatabase;
import org.bson.Document;

import java.util.Arrays;
import java.util.List;

public class BenchmarkRunner {
    private static final String CONNECTION_STRING = "mongodb://localhost:27017";
    private static final String DATABASE_NAME = "olist_analytics";

    public static void main(String[] args) {
        try (MongoClient mongoClient = MongoClients.create(CONNECTION_STRING)) {
            MongoDatabase db = mongoClient.getDatabase(DATABASE_NAME);

            System.out.println("=================================================");
            System.out.println("      RUNNING AGGREGATION BENCHMARK (JAVA)      ");
            System.out.println("=================================================");

            // Target Pipeline: Monthly trend aggregation
            List<Document> pipeline = Arrays.asList(
                    new Document("$match", new Document("order_status", "delivered")),
                    new Document("$unwind", "$items"),
                    new Document("$group", new Document("_id", "$items.product_id")
                            .append("totalRevenue", new Document("$sum", "$items.price"))),
                    new Document("$sort", new Document("totalRevenue", -1)),
                    new Document("$limit", 10)
            );

            // Execute explain with executionStats verbosity
            Document explainCommand = new Document("aggregate", "orders")
                    .append("pipeline", pipeline)
                    .append("explain", true);

            long startTime = System.currentTimeMillis();
            Document explanation = db.runCommand(explainCommand);
            long totalExecutionTime = System.currentTimeMillis() - startTime;

            System.out.println("Benchmark Completed in: " + totalExecutionTime + " ms");
            System.out.println("\nExecution Stages Plan:");
            System.out.println(explanation.toJson());
            System.out.println("=================================================");
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}