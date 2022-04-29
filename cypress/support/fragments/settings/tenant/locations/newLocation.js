import uuid from 'uuid';
import getRandomPostfix from '../../../../utils/stringTools';

export default {
  defaultUiLocation: {
    body: {
      id: uuid(),
      name: `autotest_location_${getRandomPostfix()}`,
      code: uuid(),
      discoveryDisplayName: `autotest_discovery_display_name_${getRandomPostfix()}`,
      isActive: true,
      institutionId: '40ee00ca-a518-4b49-be01-0638d0a4ac57',
      campusId: '62cf76b7-cca5-4d33-9217-edf42ce1a848',
      libraryId: '5d78803e-ca04-4b4a-aeae-2c63b924518b',
      servicePointIds: [],
      primaryServicePoint: ''
    }
  }
};
