/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface UserProfile {
  age: number;
  birthdate?: string; // e.g. "2000-01-01"
  height: number;
  weight: number;
  gender: "male" | "female";
  goal: "lose" | "maintain" | "gain";
  conditions: string;
  onboarded?: boolean;
}

export interface MacroNutrients {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber?: number;
  sodium?: number;
}

export interface AnalysisResult {
  productName: string;
  healthScore: number;
  category: "dairy" | "beverage" | "snacks" | "traditional" | "fast_food" | "bakery" | "general";
  novaCategory: number; // 1 to 4
  macros: MacroNutrients;
  pros: string[];
  cons: string[];
  verdict: string;
  ingredientsFound: string[];
  allergensAlerts: string[];
  reviewsAnalysis?: {
    sentiment: "positive" | "negative" | "mixed" | "neutral";
    ratingEstimate: string;
    summary: string;
  };
  goalEvaluation?: string;
}

export interface MealLog {
  id: string;
  productName: string;
  timestamp: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  healthScore: number;
  image?: string;
}

export interface CoachMessage {
  id: string;
  role: "user" | "coach";
  text: string;
  timestamp: string;
}

export type AppLanguage = "ru" | "uz";
