@'
# Olist E-Commerce Analytics Platform

A full-stack Big Data Analytics platform built with React, Node.js/Express, and MongoDB.

## Features
- **Real-Time Data Ingestion & CRUD**: Direct CRUD operations mapped to live MongoDB collections (`customers`, `products`, `orders`).
- **Multi-Dimensional Filtering**: Dynamic server-side filtering across State, City, Zip Range, Category, Weight Class, and Order Status.
- **Strict Aggregation Analytics**: MongoDB aggregation pipelines calculating actual revenue velocity, order volumes, and average basket sizes with zero synthetic fallbacks.
- **Visual Intelligence**: Interactive Recharts dashboards visualizing temporal purchase patterns and category unit velocity.

## Tech Stack
- **Frontend**: React, Recharts, Lucide Icons
- **Backend**: Node.js, Express.js
- **Database**: MongoDB (Atlas & Local Compass)
'@ | Out-File -Encoding utf8 README.md