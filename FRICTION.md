# Observed platform feedback — September 6, 2026

The first Nova Lite tool call failed with `ValidationException`. Nova v1 supports only `type`, `properties` and `required` at the tool schema's top level; removing `additionalProperties` resolved that request-format problem. See the [official troubleshooting guide](https://docs.aws.amazon.com/nova/latest/userguide/tools-troubleshooting.html).

A later tool-result request rejected a top-level array in `toolResult.content.json`. Wrapping synthetic availability in `{calendars: [...]}` made the result a JSON object. The live test records whether the corrected end-to-end flow succeeds.

Requested improvement: schema validation before sending a model request, with a direct reference to the supported schema subset and an example for no-argument tools and collection results. These are observed development issues, not claims about Alexa hardware behavior.
