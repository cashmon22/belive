export type AssignmentCategory =
  | "Product Research"
  | "Product Data Verification"
  | "Product Categorization"
  | "Product Attribute Review"
  | "Search Relevance Evaluation"
  | "Product Listing Quality Review"
  | "Product Image Review"
  | "Product Review Analysis"
  | "Pricing Research"
  | "Product Availability Research"
  | "Shopping Experience Evaluation"
  | "Competitor Product Research"
  | "Product Content Classification";

export type AssignmentStatus = "Available" | "Limited" | "Full";

export interface Assignment {
  id: string;
  title: string;
  category: AssignmentCategory;
  description: string;
  estimatedTime: string;
  reward: number;
  status: AssignmentStatus;
}

export const assignmentCategories: AssignmentCategory[] = [
  "Product Research",
  "Product Data Verification",
  "Product Categorization",
  "Product Attribute Review",
  "Search Relevance Evaluation",
  "Product Listing Quality Review",
  "Product Image Review",
  "Product Review Analysis",
  "Pricing Research",
  "Product Availability Research",
  "Shopping Experience Evaluation",
  "Competitor Product Research",
  "Product Content Classification",
];

export const assignments: Assignment[] = [
  {
    id: "asg-001",
    title: "Product Feature Research",
    category: "Product Research",
    description:
      "Research assigned products and collect accurate information about product features, specifications, sizes, colors, compatibility, and other relevant details.",
    estimatedTime: "45 min",
    reward: 65,
    status: "Available",
  },
  {
    id: "asg-002",
    title: "Product Listing Verification",
    category: "Product Data Verification",
    description:
      "Review product listing information and identify missing, inaccurate, outdated, or inconsistent product details across assigned marketplace listings.",
    estimatedTime: "30 min",
    reward: 35,
    status: "Available",
  },
  {
    id: "asg-003",
    title: "Marketplace Category Assignment",
    category: "Product Categorization",
    description:
      "Assign products to the appropriate marketplace category and subcategory based on the provided classification guidelines and product information.",
    estimatedTime: "25 min",
    reward: 50,
    status: "Available",
  },
  {
    id: "asg-004",
    title: "Product Attribute Validation",
    category: "Product Attribute Review",
    description:
      "Review product listings and verify attributes such as brand, material, dimensions, color, size, compatibility, and product type for accuracy and completeness.",
    estimatedTime: "35 min",
    reward: 50,
    status: "Available",
  },
  {
    id: "asg-005",
    title: "Shopper Search Relevance Rating",
    category: "Search Relevance Evaluation",
    description:
      "Review shopper search queries and product results, then rate how relevant each result is to the searcher's intent and expectations.",
    estimatedTime: "40 min",
    reward: 65,
    status: "Available",
  },
  {
    id: "asg-006",
    title: "Product Listing Quality Assessment",
    category: "Product Listing Quality Review",
    description:
      "Evaluate product titles, bullet points, descriptions, and listing information for completeness, clarity, and consistency with marketplace standards.",
    estimatedTime: "50 min",
    reward: 80,
    status: "Available",
  },
  {
    id: "asg-007",
    title: "Product Image Quality Review",
    category: "Product Image Review",
    description:
      "Review product images for quality, clarity, relevance, and whether the images accurately represent the listed product and its key features.",
    estimatedTime: "20 min",
    reward: 20,
    status: "Available",
  },
  {
    id: "asg-008",
    title: "Customer Review Theme Analysis",
    category: "Product Review Analysis",
    description:
      "Analyze existing customer reviews to identify recurring themes, customer concerns, product issues, and overall sentiment trends for assigned products.",
    estimatedTime: "60 min",
    reward: 100,
    status: "Available",
  },
  {
    id: "asg-009",
    title: "Marketplace Pricing Verification",
    category: "Pricing Research",
    description:
      "Research and verify product pricing information for assigned marketplace products, comparing listed prices against current market data.",
    estimatedTime: "35 min",
    reward: 50,
    status: "Available",
  },
  {
    id: "asg-010",
    title: "Product Availability Check",
    category: "Product Availability Research",
    description:
      "Check assigned products for availability and record relevant availability information including stock status, variants, and regional differences.",
    estimatedTime: "25 min",
    reward: 35,
    status: "Available",
  },
  {
    id: "asg-011",
    title: "Shopping Experience Evaluation",
    category: "Shopping Experience Evaluation",
    description:
      "Complete assigned shopping scenarios and provide structured feedback about search, navigation, product information, and overall shopping usability.",
    estimatedTime: "75 min",
    reward: 125,
    status: "Available",
  },
  {
    id: "asg-012",
    title: "Competitor Product Comparison",
    category: "Competitor Product Research",
    description:
      "Research comparable products and record differences in features, specifications, pricing, and marketplace positioning relative to assigned target products.",
    estimatedTime: "90 min",
    reward: 150,
    status: "Available",
  },
  {
    id: "asg-013",
    title: "Product Content Taxonomy Classification",
    category: "Product Content Classification",
    description:
      "Classify product titles, descriptions, and other marketplace content according to the provided taxonomy and classification guidelines.",
    estimatedTime: "30 min",
    reward: 50,
    status: "Limited",
  },
];
