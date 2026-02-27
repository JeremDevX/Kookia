# AI Entry Point - Start Here

Version: 1.0
Scope: operational entrypoint for any AI agent working on corrections

## Objective
Provide one single start file so the agent can automatically:
- navigate the correction docs,
- select the next ticket to execute,
- apply the mandatory workflow,
- update progress tracking correctly.

## Mandatory doc order (read in this exact order)
1. [docs/audit/corrections/README.md](./docs/audit/corrections/README.md)
2. [docs/audit/corrections/WORKFLOW_IMPERATIF_AGENT.md](./docs/audit/corrections/WORKFLOW_IMPERATIF_AGENT.md)
3. [docs/audit/corrections/BEST_PRACTICES_AGENT.md](./docs/audit/corrections/BEST_PRACTICES_AGENT.md)
4. [docs/audit/corrections/PROCESS_STANDARD.md](./docs/audit/corrections/PROCESS_STANDARD.md)
5. [docs/audit/corrections/ROADMAP_AI_DRIVEN.md](./docs/audit/corrections/ROADMAP_AI_DRIVEN.md)

Then open the selected ticket file:
- `docs/audit/corrections/Px-xx/README.md`

## Ticket selection algorithm (strict)
Use the roadmap table in `docs/audit/corrections/README.md`.

Pick the FIRST ticket that matches all rules:
1. `A faire = [x]`
2. `Fait = [ ]`
3. `Teste = [ ]`
4. all dependencies are done

Dependency done condition:
- dependency row has `A faire = [ ]` and `Fait = [x]` and `Teste = [x]`

If no ticket matches:
- stop and report: "No executable ticket available (blocked by dependencies or all done)."

## Execution state machine (required)
For each selected ticket:
1. Set ticket status to `in_progress` in ticket file.
2. Execute all workflow steps from `WORKFLOW_IMPERATIF_AGENT.md`.
3. Run quality gates:
   - `npm run lint`
   - `npm run build`
   - ticket-specific tests/checks
4. If implementation complete:
   - set roadmap `Fait = [x]`
5. If technical + functional validation complete:
   - set roadmap `Teste = [x]`
   - set roadmap `A faire = [ ]`
   - set ticket status to `done`
6. If blocked:
   - keep `A faire = [x]`
   - keep `Fait/Teste = [ ]`
   - set ticket status to `blocked`
   - document blocker and next action in ticket file

## Update protocol (required after each ticket)
Update BOTH:
1. ticket file `docs/audit/corrections/Px-xx/README.md`
2. roadmap table in `docs/audit/corrections/README.md`

Minimum required update in ticket file:
- status
- root cause
- files changed
- commands run
- validation results
- residual risks

## Scope control rules
- Do not work on multiple tickets in one pass unless explicitly requested.
- Do not change files outside ticket scope unless required for compilation and documented.
- Do not skip documentation updates.
- Do not mark `Teste = [x]` without explicit technical + functional validation evidence.

## Fast start checklist
1. Read this file.
2. Open correction index.
3. Pick next executable ticket with the algorithm.
4. Open ticket plan.
5. Execute workflow.
6. Update ticket + roadmap.
7. Report final status.

## If user asks "start now"
- automatically start from the next executable ticket using this entrypoint.
