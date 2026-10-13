using System.Security.Claims;
using Boulder.Api.Errors;
using Boulder.Application.Users;
using Boulder.Domain.Users;
using Microsoft.AspNetCore.Authorization;
using Serilog;

namespace Boulder.Api.Auth;

/// <summary>Marks an endpoint that works before onboarding is complete.</summary>
public sealed class AllowNotOnboardedMetadata;

/// <summary>Marks an endpoint that a suspended user may still call (AUTH-6).</summary>
public sealed class AllowSuspendedMetadata;

public static class AccountGateEndpointExtensions
{
    public static TBuilder AllowNotOnboarded<TBuilder>(this TBuilder builder)
        where TBuilder : IEndpointConventionBuilder =>
        builder.WithMetadata(new AllowNotOnboardedMetadata());

    public static TBuilder AllowSuspended<TBuilder>(this TBuilder builder)
        where TBuilder : IEndpointConventionBuilder =>
        builder.WithMetadata(new AllowSuspendedMetadata());
}

/// <summary>The caller of the current request; filled in by <see cref="AccountGateMiddleware"/>.</summary>
public sealed class CurrentUser : ICurrentUser
{
    public string AuthSubject { get; set; } = "";

    public User? User { get; set; }
}

/// <summary>
/// Resolves the user behind the token and applies the onboarding gate (AUTH-3) and the suspension gate (AUTH-6)
/// (architecture 3.3, step 6).
/// </summary>
public sealed class AccountGateMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(
        HttpContext context, CurrentUser current, IUserStore users, IDiagnosticContext diagnostics)
    {
        var endpoint = context.GetEndpoint();
        if (endpoint is null
            || context.User.Identity?.IsAuthenticated != true
            || endpoint.Metadata.GetMetadata<IAllowAnonymous>() is not null)
        {
            await next(context);
            return;
        }

        var subject = context.User.FindFirstValue("sub");
        if (string.IsNullOrEmpty(subject))
        {
            await Reject(context, StatusCodes.Status401Unauthorized, ErrorCodes.Unauthorized);
            return;
        }

        current.AuthSubject = subject;
        current.User = await users.FindByAuthSubjectAsync(subject, context.RequestAborted);

        switch (current.User)
        {
            case null when endpoint.Metadata.GetMetadata<AllowNotOnboardedMetadata>() is null:
                await Reject(context, StatusCodes.Status403Forbidden, ErrorCodes.OnboardingRequired);
                return;
            case { Status: UserStatus.Deleted }:
                await Reject(context, StatusCodes.Status401Unauthorized, ErrorCodes.Unauthorized);
                return;
            case { Status: UserStatus.Suspended } when endpoint.Metadata.GetMetadata<AllowSuspendedMetadata>() is null:
                await Reject(context, StatusCodes.Status403Forbidden, ErrorCodes.AccountSuspended);
                return;
        }

        if (current.User is not null)
        {
            diagnostics.Set("UserId", current.User.Id); // SEC-11: user ids only
        }

        await next(context);
    }

    private static Task Reject(HttpContext context, int status, string code) =>
        ProblemResults.Problem(status, code).ExecuteAsync(context);
}
