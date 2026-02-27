import { describe, expect, it } from "vitest";
import {
  validateAddProductForm,
  validateProductionQuantity,
  validateRecordProductionForm,
} from "./formValidation";

describe("formValidation", () => {
  describe("validateAddProductForm", () => {
    it("accepts valid product form values", () => {
      const result = validateAddProductForm({
        name: "Tomates cerises",
        category: "Légumes",
        currentStock: "12",
        unit: "kg",
        minThreshold: "3",
        pricePerUnit: "4.2",
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it("rejects invalid bounds and required values", () => {
      const result = validateAddProductForm({
        name: " ",
        category: "Invalid",
        currentStock: "-1",
        unit: "invalid" as never,
        minThreshold: "-4",
        pricePerUnit: "0",
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.name).toBeTruthy();
      expect(result.errors.category).toBeTruthy();
      expect(result.errors.currentStock).toBeTruthy();
      expect(result.errors.unit).toBeTruthy();
      expect(result.errors.minThreshold).toBeTruthy();
      expect(result.errors.pricePerUnit).toBeTruthy();
    });

    it("rejects partially numeric inputs", () => {
      const result = validateAddProductForm({
        name: "Tomates",
        category: "Légumes",
        currentStock: "12abc",
        unit: "kg",
        minThreshold: "5abc",
        pricePerUnit: "10xyz",
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.currentStock).toBeTruthy();
      expect(result.errors.minThreshold).toBeTruthy();
      expect(result.errors.pricePerUnit).toBeTruthy();
    });
  });

  describe("validateRecordProductionForm", () => {
    it("accepts valid production form values", () => {
      const result = validateRecordProductionForm({
        recipeName: "Tarte tomate",
        portions: "24",
        prepTime: "40",
        notes: "Production du midi.",
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it("rejects empty or out-of-range values", () => {
      const result = validateRecordProductionForm({
        recipeName: "",
        portions: "0",
        prepTime: "-1",
        notes: "x".repeat(501),
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.recipeName).toBeTruthy();
      expect(result.errors.portions).toBeTruthy();
      expect(result.errors.prepTime).toBeTruthy();
      expect(result.errors.notes).toBeTruthy();
    });

    it("rejects partially numeric values for portions and prep time", () => {
      const result = validateRecordProductionForm({
        recipeName: "Lasagnes",
        portions: "12abc",
        prepTime: "10xyz",
        notes: "",
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.portions).toBeTruthy();
      expect(result.errors.prepTime).toBeTruthy();
    });
  });

  describe("validateProductionQuantity", () => {
    it("accepts a quantity inside bounds", () => {
      const result = validateProductionQuantity("5", 8);

      expect(result.isValid).toBe(true);
      expect(result.normalizedQuantity).toBe(5);
      expect(result.error).toBeUndefined();
    });

    it("rejects empty quantity and keeps safe fallback", () => {
      const result = validateProductionQuantity(" ", 7);

      expect(result.isValid).toBe(false);
      expect(result.normalizedQuantity).toBe(7);
      expect(result.error).toBeTruthy();
    });

    it("rejects quantity outside bounds", () => {
      const result = validateProductionQuantity("100", 12);

      expect(result.isValid).toBe(false);
      expect(result.normalizedQuantity).toBe(12);
      expect(result.error).toContain("entre 1 et 12");
    });

    it("rejects partially numeric quantity", () => {
      const result = validateProductionQuantity("5abc", 12);

      expect(result.isValid).toBe(false);
      expect(result.normalizedQuantity).toBe(12);
      expect(result.error).toBeTruthy();
    });
  });
});
