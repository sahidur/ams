import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { randomInt } from "crypto";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// API fetch with timeout and better error handling
export async function fetchWithTimeout(
  url: string, 
  options: RequestInit = {}, 
  timeout = 15000
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout - please try again');
    }
    throw error;
  }
}

// Safe JSON fetch with timeout
export async function safeFetch<T>(
  url: string, 
  options: RequestInit = {}
): Promise<{ data: T | null; error: string | null }> {
  try {
    const res = await fetchWithTimeout(url, options);
    const data = await res.json();
    
    if (!res.ok) {
      return { data: null, error: data.error || 'Request failed' };
    }
    
    return { data, error: null };
  } catch (error) {
    console.error('Fetch error:', error);
    return { 
      data: null, 
      error: error instanceof Error ? error.message : 'Network error' 
    };
  }
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function generateRandomPin(): string {
  // Use cryptographically secure random number generator
  return randomInt(100000, 999999).toString();
}

export function getRoleDisplayName(role: string): string {
  const roleNames: Record<string, string> = {
    ADMIN: "Administrator",
    HO_USER: "HO User",
    TRAINER: "Trainer",
    STUDENT: "Student",
    BASIC_USER: "Basic User",
  };
  return roleNames[role] || role;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-800",
    APPROVED: "bg-green-100 text-green-800",
    REJECTED: "bg-red-100 text-red-800",
  };
  return colors[status] || "bg-gray-100 text-gray-800";
}
