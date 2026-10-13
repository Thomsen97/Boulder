using Serilog.Core;
using Serilog.Events;

namespace Boulder.Api.Logging;

/// <summary>
/// SEC-11: the hosting log scope adds the request path to every event written during a request, and the path
/// of the user endpoints contains usernames. Events keep the route pattern instead.
/// </summary>
public sealed class RequestPathRemover : ILogEventEnricher
{
    public void Enrich(LogEvent logEvent, ILogEventPropertyFactory propertyFactory)
        => logEvent.RemovePropertyIfPresent("RequestPath");
}
