import uuid from 'uuid';
import getRandomPostfix from '../../utils/stringTools';

export default {
  defaultUiServicePoint : {
    body: {
      code: `autotest_code_${getRandomPostfix()}`,
      discoveryDisplayName: `autotest_discovery_display_name_${getRandomPostfix()}`,
      id: uuid(),
      name: `autotest_service_${getRandomPostfix()}`,
    }
  },
  defaultUiInstitutions : {
    body: {
      code: `autotest_code_${getRandomPostfix()}`,
      id: uuid(),
      name: `autotest_name_${getRandomPostfix()}`,
    }
  },
  defaultUiCampuses : {
    body: {
      code: `autotest_code_${getRandomPostfix()}`,
      id: uuid(),
      institutionId: uuid(),
      name: `autotest_name_${getRandomPostfix()}`,
    }
  },
  defaultUiLibraries : {
    body: {
      campusId: uuid(),
      code: `autotest_code_${getRandomPostfix()}`,
      id: uuid(),
      name: `autotest_name_${getRandomPostfix()}`,
    }
  },
  defaultUiLocations : {
    body: {
      campusId: uuid(),
      code: `autotest_code_${getRandomPostfix()}`,
      discoveryDisplayName: `autotest_discovery_display_name_${getRandomPostfix()}`,
      id: uuid(),
      institutionId: uuid(),
      isActive: true,
      libraryId: uuid(),
      name: `autotest_name_${getRandomPostfix()}`,
      primaryServicePoint: uuid(),
      servicePointIds: uuid(),
    }
  },
};
