/** Spec 047 changes help independently of the frozen page structure and field contracts. */
export function withoutHelpMetadata(value: unknown): unknown {
    return JSON.parse(
        JSON.stringify(value, (key, entry) =>
            key === 'docsPath' || key === 'hideHelp' ? undefined : entry
        )
    );
}
