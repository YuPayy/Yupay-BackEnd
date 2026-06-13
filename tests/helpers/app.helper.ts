import request from "supertest";
import { Express } from "express";

let _app: Express | null = null;

export function getApp(): Express {
  if (!_app) {
    // Import lazily to ensure dotenv is loaded first
    const appModule = require("../../backend_app/app").default;
    _app = appModule;
  }
  return _app;
}

export function getRequest() {
  return request(getApp());
}
