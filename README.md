# 🔍 HTTP/HTTPS Monitoring System

![Status](https://img.shields.io/badge/Status-Prototype-orange?style=for-the-badge)
![Built With](https://img.shields.io/badge/Tech-mitmproxy%20%7C%20MongoDB%20%7C%20Node.js%20%7C%20React-blue?style=for-the-badge)

---

## 🚀 Overview

This project is an **HTTP/HTTPS monitoring system** that leverages **mitmproxy** to intercept traffic on a configured proxy port, capture request/response flows, and persist them (e.g., into MongoDB). A backend API exposes the captured data and a frontend consumes the API to display full request and response details (method, version, path, headers, cookies, body, timestamps, etc.).

**Use cases**
- Network debugging and troubleshooting  
- Security research in controlled lab environments  
- Request/response analytics and auditing

> **Important:** Only run this system in environments you own or have explicit permission to monitor. Intercepting traffic without authorization is illegal and unethical.

---

## ✨ Key Features

- Intercepts HTTP and HTTPS via mitmproxy on a chosen proxy port  
- Captures full request and response metadata: method, HTTP version, scheme/host/path, query, headers, cookies, body, status, timing, client info, TLS details  
- Backend REST API to store, query, filter, paginate, and delete captured flows  
- Frontend UI to inspect request/response pairs with raw/parsed views and filtering controls  
- Support for routing traffic using `proxychains` or browser extensions like FoxyProxy

---

## 🛠️ Prerequisites

- mitmproxy (v8+ recommended)  
- Node.js (v16+), npm or yarn for backend/frontend  
- MongoDB (v4.4+) or another datastore of your choice  
- A modern browser and optional FoxyProxy extension or `proxychains` for redirecting traffic through mitmproxy

---

## ⚙️ Setup & Installation (High-level)

1. **Install mitmproxy** on the machine that will act as the proxy.
2. **Create a mitmproxy addon** (collector) that sends captured flows to your backend API (or writes directly to the database). A minimal example is provided below.
3. **Implement the backend API** (e.g., Node.js/Express) with endpoints to receive captures and to serve queries to the frontend.
4. **Build the frontend** (e.g., React) that fetches the captures via the backend API and displays them with filtering and detail views.
5. **Configure clients** (browser or CLI) to use mitmproxy as their HTTP/HTTPS proxy (FoxyProxy, proxychains, or environment variables).
6. **Install mitmproxy CA certificate** on clients for HTTPS interception.

---

## 🔎 Minimal mitmproxy Addon (collector.py)

Place this file in your mitmproxy addons folder and run mitmproxy with `-s collector.py` or load it via your mitmproxy configuration.

