"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, ExternalLink, Sparkles } from "lucide-react";
import type { ToolOptimizationResult, Feature } from "@/lib/ai/toolOptimization";

interface ToolOptimizationCardProps {
  optimization: ToolOptimizationResult;
  onTryNow?: () => void;
}

export function ToolOptimizationCard({
  optimization,
  onTryNow,
}: ToolOptimizationCardProps) {
  const [expandedFeatures, setExpandedFeatures] = useState<Set<string>>(new Set());

  const toggleFeature = (featureName: string) => {
    const newExpanded = new Set(expandedFeatures);
    if (newExpanded.has(featureName)) {
      newExpanded.delete(featureName);
    } else {
      newExpanded.add(featureName);
    }
    setExpandedFeatures(newExpanded);
  };

  return (
    <div className="border border-purple-200 dark:border-purple-800 rounded-lg p-4 bg-purple-50 dark:bg-purple-900/20">
      <div className="flex items-start gap-3 mb-3">
        <div className="p-2 bg-purple-100 dark:bg-purple-900/40 rounded-lg">
          <Sparkles size={20} className="text-purple-600 dark:text-purple-400" />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-1">
            Optimize {optimization.toolName}
          </h4>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
            Current usage: {optimization.currentUsage}
          </p>
          {optimization.relevanceScore >= 7 && (
            <span className="inline-block px-2 py-1 text-xs font-medium bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200 rounded">
              Highly Relevant
            </span>
          )}
        </div>
      </div>

      {optimization.untappedFeatures.length > 0 && (
        <div className="mb-4">
          <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
            Untapped Features ({optimization.untappedFeatures.length})
          </h5>
          <div className="space-y-2">
            {optimization.untappedFeatures.map((feature, idx) => (
              <FeatureCard
                key={idx}
                feature={feature}
                isExpanded={expandedFeatures.has(feature.name)}
                onToggle={() => toggleFeature(feature.name)}
              />
            ))}
          </div>
        </div>
      )}

      {optimization.stepByStepGuide && (
        <div className="mb-4">
          <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
            Step-by-Step Guide
          </h5>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {optimization.stepByStepGuide}
          </div>
        </div>
      )}

      {onTryNow && (
        <button
          onClick={onTryNow}
          className="w-full mt-3 px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 rounded-lg transition-colors"
        >
          Try This Now
        </button>
      )}
    </div>
  );
}

interface FeatureCardProps {
  feature: Feature;
  isExpanded: boolean;
  onToggle: () => void;
}

function FeatureCard({ feature, isExpanded, onToggle }: FeatureCardProps) {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        <div className="flex-1">
          <h6 className="font-medium text-sm text-gray-900 dark:text-white">
            {feature.name}
          </h6>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            {feature.description}
          </p>
        </div>
        {isExpanded ? (
          <ChevronUp size={16} className="text-gray-400 ml-2 flex-shrink-0" />
        ) : (
          <ChevronDown size={16} className="text-gray-400 ml-2 flex-shrink-0" />
        )}
      </button>
      {isExpanded && (
        <div className="px-3 pb-3 border-t border-gray-200 dark:border-gray-700 pt-3">
          <div className="text-xs space-y-2">
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Benefit: </span>
              <span className="text-gray-600 dark:text-gray-400">{feature.benefit}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">How to use: </span>
              <span className="text-gray-600 dark:text-gray-400">{feature.howToUse}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

