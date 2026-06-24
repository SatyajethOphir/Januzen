import { Product, ProductOption } from "../types";

export function getProductOptions(product: Product): ProductOption[] {
  // If product already has options, use them.
  if (product.options && product.options.length > 0) {
    return product.options;
  }

  // Otherwise, let's generate options dynamically based on the product name and shop:
  if (product.shop === "medicals") {
    // Medicals products: Pieces/Tablets vs Whole Set/Sheet or Bottle
    const nameLower = product.name.toLowerCase();
    if (nameLower.includes("tablet") || nameLower.includes("capsule") || nameLower.includes("amoxicillin") || nameLower.includes("metformin") || nameLower.includes("ibuprofen") || nameLower.includes("cetirizine") || nameLower.includes("multivitamin")) {
      const isTablet = nameLower.includes("tablet") || nameLower.includes("metformin") || nameLower.includes("cetirizine") || nameLower.includes("ibuprofen");
      const unitSingular = isTablet ? "tablet" : "capsule";
      const unitPlural = isTablet ? "tablets" : "capsules";
      return [
        { name: `Loose Pieces (Individual ${unitSingular})`, price: Math.round((product.price / 10) * 100) / 100 },
        { name: `Whole Sheet (10 ${unitPlural})`, price: product.price }
      ];
    } else {
      // General medical products: Single Unit vs Clinic Set
      return [
        { name: "Single Piece", price: product.price },
        { name: "Whole Set (Pack of 5)", price: Math.round((product.price * 4.5) * 100) / 100 }
      ];
    }
  } else {
    // Stationery products: Pieces/Individual vs Whole Box/Set
    const nameLower = product.name.toLowerCase();
    if (nameLower.includes("pencil")) {
      return [
        { name: "Loose Pieces (Individual Pencil)", price: Math.round((product.price / 12) * 100) / 100 },
        { name: "Box of 12 Pencils (Whole Set)", price: product.price }
      ];
    } else if (nameLower.includes("pen") || nameLower.includes("marker")) {
      const unitLabel = nameLower.includes("pen") ? "Pen" : "Marker";
      return [
        { name: `Loose Pieces (Individual ${unitLabel})`, price: Math.round((product.price / 10) * 100) / 100 },
        { name: `Box of 10 ${unitLabel}s (Whole Set)`, price: product.price }
      ];
    } else {
      return [
        { name: "Single Item (Piece)", price: product.price },
        { name: "Whole Set (Pack of 6)", price: Math.round((product.price * 5) * 100) / 100 }
      ];
    }
  }
}

