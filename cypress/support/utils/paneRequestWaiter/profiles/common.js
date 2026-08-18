import { PANE_REQUEST_PHASES } from '../constants';
import { settingsEntries, tags } from '../routes';
import { responseRecords } from '../utils/responses';

const tagsAreEnabled = ({ responses }) => {
  const configs = responseRecords(responses, 'settingsEntries', 'items');

  return !configs.length || configs[0].value === true || configs[0].value === 'true';
};

/** Tag options are fetched only after the tags setting enables them. */
export const tagsDependency = {
  phase: PANE_REQUEST_PHASES.FILTERS,
  route: tags,
  dependsOn: [settingsEntries.id],
  when: tagsAreEnabled,
};
