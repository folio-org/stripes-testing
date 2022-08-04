import uuid from 'uuid';
import getRandomPostfix from '../../../../utils/stringTools';
import Institutions from '../institutions';
import Campuses from '../campuses';
import Libraries from '../libraries';

const getDefaultLocation = (specialServicePointId, specialInstitutionId, specialCampusId, specialLibraryId) => {
  const defaultLocation = {
    id: uuid(),
    isActive: true,
    // requared field
    institutionId: specialInstitutionId,
    // requared field
    campusId: specialCampusId,
    // requared field
    libraryId: specialLibraryId,
    // servicePointIds must have real Servi point id
    servicePointIds: [specialServicePointId],
    name: `autotest_location_name_${getRandomPostfix()}`,
    code: `autotest_location_code_${getRandomPostfix()}`,
    discoveryDisplayName: `autotest_name_${getRandomPostfix()}`,
    // servicePointIds must have real Servis point id
    primaryServicePoint: specialServicePointId,
  };
  if (!defaultLocation.institutionId) {
    Institutions.createViaApi(Institutions.getDefaultInstitutions())
      .then(locinsts => {
        defaultLocation.institutionId = locinsts.id;
        if (!defaultLocation.campusId) {
          Campuses.createViaApi({ ...Campuses.getDefaultCampuse(), institutionId: defaultLocation.institutionId })
            .then(loccamps => {
              defaultLocation.campusId = loccamps.id;
              if (!defaultLocation.libraryId) {
                Libraries.createViaApi({ ...Libraries.getDefaultLibrary(), campusId: defaultLocation.campusId })
                  .then(loclibs => {
                    defaultLocation.libraryId = loclibs.id;
                  });
              }
            });
        }
      });
  }
  return defaultLocation;
};

export default {
  getDefaultLocation,

  createViaApi: (locationProperties = getDefaultLocation) => {
    return cy
      .okapiRequest({
        path: 'locations',
        body: locationProperties,
        method: 'POST',
        isDefaultSearchParamsRequired: false,
      })
      .then((response) => {
        return response.body;
      });
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
