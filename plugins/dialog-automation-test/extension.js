// Built-in end-to-end validation plugin for the proposed dialog automation API.
const vscode = require('vscode');

const COMMAND_ID = 'theia-dialog-automation-test.run';
const OUTPUT_NAME = 'Dialog Automation Verification';

function delay(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
}

async function waitFor(description, operation, timeout = 5000) {
    const deadline = Date.now() + timeout;
    let lastError;
    while (Date.now() < deadline) {
        try {
            const result = await operation();
            if (result) {
                return result;
            }
        } catch (error) {
            lastError = error;
        }
        await delay(50);
    }
    const suffix = lastError ? ` Last error: ${lastError.message || String(lastError)}` : '';
    throw new Error(`Timed out waiting for ${description}.${suffix}`);
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

function formatError(error) {
    if (error instanceof Error) {
        return `${error.name}: ${error.message}\n${error.stack || ''}`;
    }
    return String(error);
}

async function runVerification(output) {
    if (typeof vscode.window.getActiveDialog !== 'function') {
        throw new Error('vscode.window.getActiveDialog is unavailable. Rebuild and restart the Browser Example.');
    }

    const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const suppliedState = {
        name: `plugin-supplied-${runId}`,
        mode: 'advanced',
        notes: `Configured through the plugin API (${runId})`,
        enabled: true
    };
    let handle;

    output.clear();
    output.show(true);
    output.appendLine('Starting dialog automation end-to-end verification...');
    output.appendLine(`Expected state: ${JSON.stringify(suppliedState)}`);

    try {
        handle = await vscode.window.getActiveDialog();
        if (!handle) {
            throw new Error('No active dialog. Run "Dialog Automation: Open Complex Test Dialog" first.');
        }
        const initialSnapshot = await handle.getSnapshot();
        const initialState = await handle.getState();
        const actions = await handle.getActions();
        output.appendLine(`Dialog id: ${handle.id}`);
        output.appendLine(`Initial snapshot: ${JSON.stringify(initialSnapshot)}`);
        output.appendLine(`Initial state: ${JSON.stringify(initialState)}`);
        output.appendLine(`Custom actions: ${JSON.stringify(actions)}`);

        assert(initialSnapshot.title === 'Dialog Automation Verification', `Unexpected dialog title: ${initialSnapshot.title}`);
        assert(initialSnapshot.confirm.available, 'The dialog did not expose a confirm control.');
        assert(initialSnapshot.cancel.available, 'The dialog did not expose a cancel control.');
        assert(initialState.name === 'initial-name', 'The dialog did not expose its initial text value.');
        assert(initialState.mode === 'standard', 'The dialog did not expose its initial selected option.');
        assert(initialState.notes === 'Initial notes', 'The dialog did not expose its initial multiline text.');
        assert(initialState.enabled === false, 'The dialog did not expose its initial checkbox state.');
        assert(actions.some(action => action.id === 'reset' && action.enabled), 'The dialog did not expose its Reset action.');

        await handle.setState({ name: 'temporary', mode: 'safe', notes: 'Reset me', enabled: true });
        await handle.invokeAction('reset');
        const resetState = await handle.getState();
        output.appendLine(`State after Reset action: ${JSON.stringify(resetState)}`);
        assert(resetState.name === 'initial-name' && resetState.mode === 'standard' && resetState.enabled === false,
            'The Reset action did not restore the dialog defaults.');

        await handle.setState(suppliedState);
        const updatedState = await handle.getState();
        output.appendLine(`Updated state: ${JSON.stringify(updatedState)}`);
        assert(JSON.stringify(updatedState) === JSON.stringify(suppliedState),
            'Reading state did not return the complete state written by the plugin.');

        // Keep the updated value visible briefly during manual verification.
        await delay(2000);
        const result = await handle.confirm();
        output.appendLine(`Confirm result: ${JSON.stringify(result)}`);
        assert(result.closed, `Confirm did not close the dialog: ${result.validationMessage || 'unknown validation error'}`);

        await waitFor('the value accepted by the application', async () =>
            JSON.stringify(await vscode.commands.executeCommand('dialogAutomationTest.getLastAcceptedValue')) === JSON.stringify(suppliedState)
        );
        assert(await vscode.window.getActiveDialog() === undefined, 'A dialog remained active after confirmation.');

        output.appendLine(`PASS: the application accepted the exact plugin-supplied state: ${JSON.stringify(suppliedState)}`);
        void vscode.window.showInformationMessage(`Dialog automation verification passed: ${suppliedState.name}`);
    } catch (error) {
        output.appendLine(`FAIL: ${formatError(error)}`);
        void vscode.window.showErrorMessage(`Dialog automation verification failed: ${error.message || String(error)}`);
        throw error;
    } finally {
        if (handle) {
            try {
                const active = await vscode.window.getActiveDialog();
                if (active && active.id === handle.id) {
                    await active.cancel();
                }
            } catch {
                // Preserve the original verification result.
            }
        }
    }
}

function activate(context) {
    const output = vscode.window.createOutputChannel(OUTPUT_NAME);
    context.subscriptions.push(
        output,
        vscode.commands.registerCommand(COMMAND_ID, () => runVerification(output))
    );
}

function deactivate() { }

module.exports = { activate, deactivate };
