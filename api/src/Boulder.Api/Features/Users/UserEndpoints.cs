using Boulder.Api.Auth;
using Boulder.Api.Errors;
using Boulder.Api.RateLimiting;
using Boulder.Application.Users;

namespace Boulder.Api.Features.Users;

public static class UserEndpoints
{
    public static IServiceCollection AddUserFeature(this IServiceCollection services)
    {
        services.AddScoped<CurrentUser>();
        services.AddScoped<ICurrentUser>(sp => sp.GetRequiredService<CurrentUser>());
        services.AddScoped<GetMeHandler>();
        services.AddScoped<CompleteOnboardingHandler>();
        services.AddScoped<UpdateMeHandler>();
        services.AddScoped<CheckUsernameAvailabilityHandler>();
        services.AddScoped<GetUserProfileHandler>();
        return services;
    }

    public static IEndpointRouteBuilder MapUserEndpoints(this IEndpointRouteBuilder app)
    {
        var api = app.MapGroup("/api/v1").WithTags("Users");

        // Before onboarding the body only says onboardingComplete: false; a suspended user still gets 200 (AUTH-6).
        api.MapGet("/me", (GetMeHandler handler) => TypedResults.Ok(handler.Handle()))
            .WithName("GetMe")
            .AllowNotOnboarded()
            .AllowSuspended()
            .Produces<MeDto>();

        api.MapPost("/me/onboarding", async (
                OnboardingRequest request, CompleteOnboardingHandler handler, CancellationToken ct) =>
            {
                var result = await handler.HandleAsync(request, ct);
                return result.IsSuccess
                    ? Results.Created("/api/v1/me", result.Value)
                    : ProblemResults.FromFailure(result.Failure!);
            })
            .WithName("CompleteOnboarding")
            .AllowNotOnboarded()
            .Produces<MeDto>(StatusCodes.Status201Created)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status409Conflict);

        api.MapPatch("/me", async (UpdateMeRequest request, UpdateMeHandler handler, CancellationToken ct) =>
            {
                var result = await handler.HandleAsync(request, ct);
                return result.IsSuccess ? Results.Ok(result.Value) : ProblemResults.FromFailure(result.Failure!);
            })
            .WithName("UpdateMe")
            .Produces<MeDto>()
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status409Conflict);

        // Onboarding asks for availability before the user exists, so this works without onboarding.
        api.MapGet("/usernames/{name}/availability", async (
                string name, CheckUsernameAvailabilityHandler handler, CancellationToken ct) =>
                TypedResults.Ok(await handler.HandleAsync(name, ct)))
            .WithName("GetUsernameAvailability")
            .AllowNotOnboarded()
            .RequireRateLimiting(RateLimitPolicies.UsernameAvailability)
            .Produces<UsernameAvailabilityDto>()
            .ProducesProblem(StatusCodes.Status429TooManyRequests);

        api.MapGet("/users/{username}", async (
                string username, GetUserProfileHandler handler, CancellationToken ct) =>
            {
                var result = await handler.HandleAsync(username, ct);
                return result.IsSuccess ? Results.Ok(result.Value) : ProblemResults.FromFailure(result.Failure!);
            })
            .WithName("GetUserProfile")
            .Produces<UserProfileDto>()
            .ProducesProblem(StatusCodes.Status404NotFound);

        return app;
    }
}
