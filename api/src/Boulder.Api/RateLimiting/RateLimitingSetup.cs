using System.Security.Claims;
using System.Threading.RateLimiting;
using Boulder.Api.Errors;
using Microsoft.AspNetCore.RateLimiting;

namespace Boulder.Api.RateLimiting;

/// <summary>Policy names follow the rows of SEC-6.</summary>
public static class RateLimitPolicies
{
    public const string UsernameAvailability = "username-availability";
}

public static class RateLimitingSetup
{
    private const int UsernameAvailabilityPerMinute = 30;

    public static IServiceCollection AddApiRateLimiting(
        this IServiceCollection services, IConfiguration configuration)
    {
        var usernameLimit = configuration.GetValue("RateLimiting:UsernameAvailabilityPerMinute", UsernameAvailabilityPerMinute);

        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

            options.AddPolicy(RateLimitPolicies.UsernameAvailability, context =>
                RateLimitPartition.GetSlidingWindowLimiter(PartitionKey(context), _ => new SlidingWindowRateLimiterOptions
                {
                    PermitLimit = usernameLimit,
                    Window = TimeSpan.FromMinutes(1),
                    SegmentsPerWindow = 6,
                    QueueLimit = 0
                }));

            options.OnRejected = async (rejected, ct) =>
            {
                var retryAfter = rejected.Lease.TryGetMetadata(MetadataName.RetryAfter, out var value)
                    ? (int)Math.Ceiling(value.TotalSeconds)
                    : 60;
                rejected.HttpContext.Response.Headers.RetryAfter = Math.Max(retryAfter, 1).ToString();
                await ProblemResults.Problem(StatusCodes.Status429TooManyRequests, ErrorCodes.RateLimited)
                    .ExecuteAsync(rejected.HttpContext);
            };
        });

        return services;
    }

    /// <summary>SEC-6: per user, per IP when unauthenticated.</summary>
    private static string PartitionKey(HttpContext context)
    {
        var subject = context.User.FindFirstValue("sub");
        return subject is not null
            ? $"user:{subject}"
            : $"ip:{context.Connection.RemoteIpAddress}";
    }
}
