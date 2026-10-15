/** The id of a tab's button, which names the region its document is drawn in. */
export const tabId = (key: string) => `pane-tab-${key.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
