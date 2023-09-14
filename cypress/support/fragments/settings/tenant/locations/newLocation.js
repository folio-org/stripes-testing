import uuid from 'uuid';
import getRandomPostfix from '../../../../utils/stringTools';
import Institutions from '../location-setup/institutions';
import Campuses from '../location-setup/campuses';
import Libraries from '../location-setup/libraries';

const getDefaultLocation = (
  specialServicePointId,
  specialInstitutionId,
  specialCampusId,
  specialLibraryId,
) => {
  const location = {
    id: uuid(),
    isActive: true,
    // requared field
    institutionId: specialInstitutionId || uuid(),
    // requared field
    campusId: specialCampusId || uuid(),
    // requared field
    libraryId: specialLibraryId || uuid(),
    // servicePointIds must have real Servi point id
    servicePointIds: [specialServicePointId],
    name: `autotest_location_name_${getRandomPostfix()}`,
    code: `autotest_location_code_${getRandomPostfix()}`,
    discoveryDisplayName: `autotest_name_${getRandomPostfix()}`,
    // servicePointIds must have real Servis point id
    primaryServicePoint: specialServicePointId,
  };

  Institutions.createViaApi(
    Institutions.getDefaultInstitutions({ id: location.institutionId }),
  ).then(() => {
    Campuses.createViaApi(
      Campuses.getDefaultCampuse({
        id: location.campusId,
        institutionId: location.institutionId,
      }),
    ).then(() => {
      Libraries.createViaApi(
        Libraries.getDefaultLibrary({
          id: location.libraryId,
          campusId: location.campusId,
        }),
      );
    });
  });
  return location;
};

export default {
  getDefaultLocation,

  createViaApi: (locationProperties) => {
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

  getDefaultUiLocation: (institutionId, campusId, libraryId) => ({
    body: {
      id: uuid(),
      name: `autotest_location_${getRandomPostfix()}`,
      code: uuid(),
      discoveryDisplayName: `autotest_discovery_display_name_${getRandomPostfix()}`,
      isActive: true,
      institutionId,
      campusId,
      libraryId,
      servicePointIds: [],
      primaryServicePoint: '',
    },
  }),

  deleteViaApiIncludingInstitutionCampusLibrary: (
    institutionId,
    campusId,
    libraryId,
    locationId,
  ) => {
    cy.okapiRequest({
      path: `locations/${locationId}`,
      method: 'DELETE',
      isDefaultSearchParamsRequired: false,
    });
    Libraries.deleteViaApi(libraryId);
    Campuses.deleteViaApi(campusId);
    Institutions.deleteViaApi(institutionId);
  },
};
