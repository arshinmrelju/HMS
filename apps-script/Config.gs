/**
 * Google Contacts Sync - Configuration
 *
 * IMPORTANT: Change these values before deploying.
 */

var CONFIG = {
  // Shared secret sent by the HMS frontend to authenticate requests.
  // Generate a strong random string and set it here.
  API_KEY: 'CHANGE_ME_TO_A_RANDOM_SECRET',

  // People API rate limit: 100 queries per 100 seconds per user.
  // Conservative delay between API calls (milliseconds).
  API_DELAY_MS: 1500,

  // Delay between individual contact operations within a batch.
  BATCH_INTERNAL_DELAY_MS: 2000,

  // Delay between batches of contacts.
  BATCH_DELAY_MS: 30000,

  // Max contacts to process in one batch request.
  BATCH_SIZE: 5,

  // Max retries for transient failures.
  MAX_RETRIES: 3,
};
