using Boulder.Api.Errors;
using Boulder.Infrastructure;
using Scalar.AspNetCore;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((ctx, services, config) =>
    config
        .ReadFrom.Configuration(ctx.Configuration)
        .ReadFrom.Services(services)
        .Enrich.FromLogContext()
        .WriteTo.Console(new Serilog.Formatting.Compact.CompactJsonFormatter()));

builder.Services.AddSingleton(TimeProvider.System);

var connectionString = builder.Configuration.GetConnectionString("Default")
    ?? throw new InvalidOperationException("Connection string 'Default' is not configured.");

builder.Services.AddPersistence(connectionString);

builder.Services
    .AddHealthChecks()
    .AddNpgSql(connectionString);

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
app.UseSerilogRequestLogging();

app.MapOpenApi();

if (app.Environment.IsDevelopment())
{
    app.MapScalarApiReference();
}

app.MapHealthChecks("/health");

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
    Log.Information("OpenAPI document written to {Path}", outputPath);
    await app.StopAsync();
    return;
}

app.Run();

static string MapStatusToCode(int status) => status switch
{
    400 => ErrorCodes.ValidationFailed,
    403 => ErrorCodes.Forbidden,
    404 => ErrorCodes.NotFound,
    409 => ErrorCodes.Conflict,
    _ => ErrorCodes.InternalError
};

public partial class Program { }
