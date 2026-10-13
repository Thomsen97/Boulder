using Serilog.Core;
using Serilog.Events;

namespace Boulder.Api.Logging;

/// <summary>
/// SEC-11: the hosting log scope adds <c>RequestPath</c> to every event written during a request, and the
/// hosting diagnostics events ("Request starting") carry <c>Path</c>. The path of the user endpoints contains
/// usernames, so both are removed. Events keep the route pattern instead.
/// </summary>
public sealed class RequestPathRemover : ILogEventEnricher
{
    public void Enrich(LogEvent logEvent, ILogEventPropertyFactory propertyFactory)
    {
        logEvent.RemovePropertyIfPresent("RequestPath");
        logEvent.RemovePropertyIfPresent("Path");
    }
}
