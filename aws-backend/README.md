# HomeRelay Bedrock tool planner

The standalone template.json creates a Lambda execution role limited to invoking Amazon Nova Lite in us-east-1. No AWS root credentials are stored. A server-to-server secret authenticates the function URL. Model use incurs AWS charges.

The fixed tool set contains get_task, list_availability and propose_handoff. The backend runs requested read tools, feeds results back to the model and permits only a draft for an available recipient. It has no approval, acceptance, messaging or calendar-write tool. The API separately persists the draft after a version check. Four model rounds and a 50-second overall timeout bound execution.

Set HOME_BACKEND_URL and HOME_BACKEND_TOKEN in server-only settings. Keep .dev.vars and parameter files out of Git. BackendToken is a NoEcho CloudFormation parameter. The template is self-contained; prepare.cjs is a local maintainer helper reusing this workspace's original September 6 infrastructure boilerplate.

This is actual Bedrock tool use over synthetic household data, not a connected Alexa device or real household calendar.
