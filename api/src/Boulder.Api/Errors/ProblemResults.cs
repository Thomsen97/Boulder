using Boulder.Application.Common;

namespace Boulder.Api.Errors;

public static class ProblemResults
{
    public static IResult Problem(
        int status, string code, IDictionary<string, object?>? extensions = null)
    {
        var all = new Dictionary<string, object?>(extensions ?? new Dictionary<string, object?>())
        {
            ["code"] = code
        };
        return Results.Problem(statusCode: status, extensions: all);
    }

    public static IResult FromFailure(Failure failure) => failure.Kind switch
    {
        FailureKind.Validation => Results.ValidationProblem(
            failure.Errors!.ToDictionary(e => e.Key, e => e.Value),
            statusCode: StatusCodes.Status400BadRequest,
            extensions: new Dictionary<string, object?> { ["code"] = ErrorCodes.ValidationFailed }),
        FailureKind.NotFound => Problem(StatusCodes.Status404NotFound, ErrorCodes.NotFound),
        FailureKind.UsernameTaken => Problem(StatusCodes.Status409Conflict, ErrorCodes.UsernameTaken),
        FailureKind.AlreadyOnboarded => Problem(StatusCodes.Status409Conflict, ErrorCodes.AlreadyOnboarded),
        FailureKind.UsernameChangeTooSoon => Problem(
            StatusCodes.Status409Conflict,
            ErrorCodes.UsernameChangeTooSoon,
            new Dictionary<string, object?> { ["nextChangeAt"] = failure.RetryAfter }),
        _ => throw new ArgumentOutOfRangeException(nameof(failure))
    };
}
