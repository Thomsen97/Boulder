using System.Collections.Concurrent;
using Serilog.Core;
using Serilog.Events;

namespace Boulder.IntegrationTests.Infrastructure;

/// <summary>Keeps every rendered log event so tests can assert on what the API logs.</summary>
public sealed class CapturingLogSink : ILogEventSink
{
    private readonly ConcurrentQueue<string> _events = new();

    public IReadOnlyCollection<string> Events => _events.ToArray();

    public void Emit(LogEvent logEvent)
    {
        // Properties and rendered message: either one leaking a username counts.
        var properties = string.Join(" ", logEvent.Properties.Select(p => $"{p.Key}={p.Value}"));
        _events.Enqueue($"{logEvent.RenderMessage()} {properties}");
    }
}
