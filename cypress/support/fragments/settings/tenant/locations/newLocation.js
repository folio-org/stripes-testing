import uuid from 'uuid';
import getRandomPostfix from '../../../../utils/stringTools';

export default {
  defaultUiLocation: {

  },
  getDefaultUiLocation:(institutionId, campusId, libraryId) => (
    { body: {
      id: uuid(),
      name: `autotest_location_${getRandomPostfix()}`,
      code: uuid(),
      discoveryDisplayName: `autotest_discovery_display_name_${getRandomPostfix()}`,
      isActive: true,
      institutionId,
      campusId,
      libraryId,
      servicePointIds: [],
      primaryServicePoint: ''
    } })
};
