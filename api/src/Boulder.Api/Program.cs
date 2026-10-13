using Microsoft.Extensions.Diagnostics.HealthChecks;
using Boulder.Api.Auth;
using Boulder.Api.Errors;
using Boulder.Api.Features.Users;
using Boulder.Api.Logging;
using Boulder.Api.RateLimiting;
using Microsoft.AspNetCore.Routing;
using Boulder.Infrastructure;
using Scalar.AspNetCore;
using Serilog;
using Serilog.Events;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((ctx, services, config) =>
    config
        .ReadFrom.Configuration(ctx.Configuration)
        .ReadFrom.Services(services)
        .Enrich.FromLogContext()
        .Enrich.With<RequestPathRemover>()
        .WriteTo.Console(new Serilog.Formatting.Compact.CompactJsonFormatter()));

builder.Services.AddSingleton(TimeProvider.System);

var connectionString = builder.Configuration.GetConnectionString("Default")
    ?? throw new InvalidOperationException("Connection string 'Default' is not configured.");

builder.Services.AddPersistence(connectionString);

builder.Services
    .AddHealthChecks()
    .AddNpgSql(connectionString);

builder.Services.AddSupabaseAuthentication(builder.Configuration);
builder.Services.AddApiRateLimiting(builder.Configuration);
builder.Services.AddUserFeature();

builder.Services.AddOpenApi();
builder.Services.AddHttpClient();
builder.Services.AddProblemDetails(options =>
    options.CustomizeProblemDetails = ctx =>
    {
        ctx.ProblemDetails.Extensions.TryAdd("code", MapStatusToCode(ctx.HttpContext.Response.StatusCode));
        ctx.ProblemDetails.Extensions.TryAdd("traceId", ctx.HttpContext.TraceIdentifier);
    });

var app = builder.Build();

app.UseExceptionHandler();
app.UseStatusCodePages();
// SEC-11: log the route pattern, not the path, because the path of the user endpoints contains usernames.
// The default template properties include RequestPath, so they are replaced; RequestPath is also removed from
// every other event by RequestPathRemover.
app.UseSerilogRequestLogging(options =>
{
    // The host's own logger, not the static Log.Logger, which the last host built in a process would replace.
    options.Logger = app.Services.GetRequiredService<Serilog.ILogger>();
    options.MessageTemplate = "HTTP {RequestMethod} {RoutePattern} responded {StatusCode} in {Elapsed:0.0000} ms";
    options.GetMessageTemplateProperties = (httpContext, _, elapsedMs, statusCode) =>
    [
        new LogEventProperty("RequestMethod", new ScalarValue(httpContext.Request.Method)),
        new LogEventProperty("RoutePattern", new ScalarValue(
            (httpContext.GetEndpoint() as RouteEndpoint)?.RoutePattern.RawText ?? "(no route)")),
        new LogEventProperty("StatusCode", new ScalarValue(statusCode)),
        new LogEventProperty("Elapsed", new ScalarValue(elapsedMs))
    ];
});

// Architecture 3.3: authentication, account gate, rate limiter, endpoint.
app.UseAuthentication();
app.UseAuthorization();
app.UseMiddleware<AccountGateMiddleware>();
app.UseRateLimiter();

app.MapOpenApi().AllowAnonymous();

if (app.Environment.IsDevelopment())
{
    app.MapScalarApiReference().AllowAnonymous();
}

app.MapGet("/health", async (HealthCheckService health, CancellationToken ct) =>
    {
        var report = await health.CheckHealthAsync(ct);
        return Results.Text(
            report.Status.ToString(),
            "text/plain",
            statusCode: report.Status == HealthStatus.Unhealthy
                ? StatusCodes.Status503ServiceUnavailable
                : StatusCodes.Status200OK);
    })
    .WithName("GetHealth")
    .AllowAnonymous()
    .Produces<string>(StatusCodes.Status200OK, "text/plain")
    .Produces<string>(StatusCodes.Status503ServiceUnavailable, "text/plain");

app.MapUserEndpoints();

// The authorization fallback policy would answer 401 for unknown routes; they are plain 404s.
app.MapFallback(() => Results.NotFound()).AllowAnonymous().ExcludeFromDescription();

if (args.Contains("--export-openapi"))
{
    await app.StartAsync();
    var client = app.Services.GetRequiredService<IHttpClientFactory>().CreateClient();
    var baseUrl = app.Urls.FirstOrDefault() ?? "http://localhost:5000";
    client.BaseAddress = new Uri(baseUrl);
    var rawJson = await client.GetStringAsync("/openapi/v1.json");

    // Remove dynamic server URLs and normalize to LF so the committed file is byte-stable
    var node = System.Text.Json.Nodes.JsonNode.Parse(rawJson)!;
    node.AsObject().Remove("servers");
    var json = node.ToJsonString(new System.Text.Json.JsonSerializerOptions { WriteIndented = true, NewLine = "\n" });

    var outputIndex = Array.IndexOf(args, "--output-path");
    var outputPath = outputIndex >= 0 && outputIndex + 1 < args.Length
        ? args[outputIndex + 1]
        : Path.GetFullPath(Path.Combine(
            AppContext.BaseDirectory, "..", "..", "..", "..", "..", "openapi", "v1.json"));

    Directory.CreateDirectory(Path.GetDirectoryName(outputPath)!);
    await File.WriteAllTextAsync(outputPath, json + "\n");
    Log.Information("OpenAPI document written to {OutputPath}", outputPath);
    await app.StopAsync();
    return;
}

app.Run();

static string MapStatusToCode(int status) => status switch
{
    400 => ErrorCodes.ValidationFailed,
    401 => ErrorCodes.Unauthorized,
    403 => ErrorCodes.Forbidden,
    404 => ErrorCodes.NotFound,
    409 => ErrorCodes.Conflict,
    429 => ErrorCodes.RateLimited,
    _ => ErrorCodes.InternalError
};

public partial class Program { }
