namespace Boulder.Api.Errors;

public static class ErrorCodes
{
    public const string ValidationFailed = "validation_failed";
    public const string Unauthorized = "unauthorized";
    public const string NotFound = "not_found";
    public const string Conflict = "conflict";
    public const string Forbidden = "forbidden";
    public const string OnboardingRequired = "onboarding_required";
    public const string AccountSuspended = "account_suspended";
    public const string AlreadyOnboarded = "already_onboarded";
    public const string UsernameTaken = "username_taken";
    public const string UsernameChangeTooSoon = "username_change_too_soon";
    public const string RateLimited = "rate_limited";
    public const string UpgradeRequired = "upgrade_required";
    public const string StorageQuotaExceeded = "storage_quota_exceeded";
    public const string MediaNotReady = "media_not_ready";
    public const string DuplicateClientId = "duplicate_client_id";
    public const string InternalError = "internal_error";
}
