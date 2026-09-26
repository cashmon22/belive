export type AssignmentCategory =
  | "Data Collection"
  | "Data Verification"
  | "Image Classification"
  | "Text Evaluation"
  | "Search Relevance Evaluation"
  | "Content Review"
  | "AI Response Evaluation"
  | "Transcription"
  | "Survey & Research Tasks";

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
  "Data Collection",
  "Data Verification",
  "Image Classification",
  "Text Evaluation",
  "Search Relevance Evaluation",
  "Content Review",
  "AI Response Evaluation",
  "Transcription",
  "Survey & Research Tasks",
];

export const assignments: Assignment[] = [
  {
    id: "asg-001",
    title: "Retail Product Data Collection",
    category: "Data Collection",
    description:
      "Visit assigned retail stores and collect product information including pricing, availability, and shelf placement data.",
    estimatedTime: "20 min",
    reward: 8.5,
    status: "Available",
  },
  {
    id: "asg-002",
    title: "Business Listing Verification",
    category: "Data Verification",
    description:
      "Verify the accuracy of business listings on maps by checking names, addresses, hours, and contact information.",
    estimatedTime: "15 min",
    reward: 6.0,
    status: "Available",
  },
  {
    id: "asg-003",
    title: "E-commerce Product Image Tagging",
    category: "Image Classification",
    description:
      "Review product images and assign appropriate category tags, attributes, and labels for improved searchability.",
    estimatedTime: "12 min",
    reward: 5.5,
    status: "Available",
  },
  {
    id: "asg-004",
    title: "Product Review Sentiment Analysis",
    category: "Text Evaluation",
    description:
      "Read customer product reviews and classify the overall sentiment as positive, negative, or neutral with reasoning.",
    estimatedTime: "10 min",
    reward: 4.5,
    status: "Available",
  },
  {
    id: "asg-005",
    title: "Search Query Relevance Rating",
    category: "Search Relevance Evaluation",
    description:
      "Rate the relevance of search results for given queries on a scale from 1 to 5 based on user intent and accuracy.",
    estimatedTime: "18 min",
    reward: 7.0,
    status: "Available",
  },
  {
    id: "asg-006",
    title: "User-Generated Content Moderation",
    category: "Content Review",
    description:
      "Review user-submitted content including text posts, images, and comments for policy compliance and appropriateness.",
    estimatedTime: "25 min",
    reward: 9.0,
    status: "Available",
  },
  {
    id: "asg-007",
    title: "AI Chatbot Response Quality",
    category: "AI Response Evaluation",
    description:
      "Evaluate the quality, accuracy, and helpfulness of AI-generated responses to user questions across multiple topics.",
    estimatedTime: "15 min",
    reward: 6.5,
    status: "Available",
  },
  {
    id: "asg-008",
    title: "Audio Interview Transcription",
    category: "Transcription",
    description:
      "Listen to audio recordings of interviews and transcribe the spoken content to text with high accuracy and formatting.",
    estimatedTime: "30 min",
    reward: 12.0,
    status: "Available",
  },
  {
    id: "asg-009",
    title: "Consumer Shopping Habits Survey",
    category: "Survey & Research Tasks",
    description:
      "Complete a structured survey about your shopping preferences, brand choices, and purchasing decision factors.",
    estimatedTime: "8 min",
    reward: 3.5,
    status: "Available",
  },
  {
    id: "asg-010",
    title: "Street View Data Annotation",
    category: "Data Collection",
    description:
      "Annotate and label objects such as road signs, buildings, and landmarks visible in street-level imagery for mapping.",
    estimatedTime: "20 min",
    reward: 8.0,
    status: "Limited",
  },
  {
    id: "asg-011",
    title: "Medical Image Region Labeling",
    category: "Image Classification",
    description:
      "Identify and label specific regions of interest in medical scan images following provided annotation guidelines.",
    estimatedTime: "22 min",
    reward: 10.0,
    status: "Available",
  },
  {
    id: "asg-012",
    title: "Multi-language Text Classification",
    category: "Text Evaluation",
    description:
      "Classify text passages by language and topical category to improve multilingual content organization systems.",
    estimatedTime: "14 min",
    reward: 5.0,
    status: "Full",
  },
];
