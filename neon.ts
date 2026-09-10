import { defineConfig } from "@neon/config/v1";

export default defineConfig({
  // Services on every branch
  auth: true,

  // Beta services, also on every branch
  preview: {
    aiGateway: true,
    buckets: {
      uploads: {},
    },
    functions: {
      api: {
        name: "api",
        source: "./functions/api.ts",
      }
    },
  },

  // Branch policy
  branch: (branch) => {
    if (branch.isDefault) {
      // Protect and size for production
      return {
        protected: true,
        postgres: {
          computeSettings: {
            autoscalingLimitMinCu: 0.5,
            autoscalingLimitMaxCu: 4,
          },
        },
      };
    }
    if (!branch.exists) {
      // New non-default branches: minimum compute, auto-expire
      return {
        ttl: "7d",
        postgres: {
          computeSettings: {
            autoscalingLimitMinCu: 0.25,
            autoscalingLimitMaxCu: 0.25,
          },
        },
      };
    }
    // Existing branch: no changes
    return {};
  },
});