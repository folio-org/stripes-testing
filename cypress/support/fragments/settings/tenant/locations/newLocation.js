import uuid from 'uuid';
import getRandomPostfix from '../../../../utils/stringTools';
import Institutions from '../location-setup/institutions';
import Campuses from '../location-setup/campuses';
import Libraries from '../location-setup/libraries';

const getDefaultLocation = (
  specialServicePointId,
  locationName,
  locationCode,
  specialInstitutionId,
  specialCampusId,
  specialLibraryId,
) => {
  const location = {
    id: uuid(),
    isActive: true,
    institutionId: specialInstitutionId || uuid(),
    institutionName: `1aa_autotest_institution_${getRandomPostfix()}`,
    campusId: specialCampusId || uuid(),
    campusName: `1aa_autotest_campuse_${getRandomPostfix()}`,
    libraryId: specialLibraryId || uuid(),
    libraryName: `1aa_autotest_library_${getRandomPostfix()}`,
    // servicePointIds must have real Service point id
    servicePointIds: [specialServicePointId],
    name: locationName || `1aa_autotest_location_name_${getRandomPostfix()}`,
    code: locationCode || `1aa_autotest_location_code_${getRandomPostfix()}`,
    discoveryDisplayName: `1aa_autotest_name_${getRandomPostfix()}`,
    // servicePointIds must have real Service point id
    primaryServicePoint: specialServicePointId,
  };

  Institutions.createViaApi(
    Institutions.getDefaultInstitution({
      id: location.institutionId,
      name: location.institutionName,
    }),
  ).then(() => {
    Campuses.createViaApi(
      Campuses.getDefaultCampuse({
        id: location.campusId,
        name: location.campusName,
        institutionId: location.institutionId,
      }),
    ).then(() => {
      Libraries.createViaApi(
        Libraries.getDefaultLibrary({
          id: location.libraryId,
          name: location.libraryName,
          campusId: location.campusId,
        }),
      );
    });
  });
  return location;
};

function getViaApi() {
  return cy
    .okapiRequest({ path: 'locations', isDefaultSearchParamsRequired: false })
    .then((response) => {
      return response.body;
    });
}

const getSystemLocation = (code) => {
  return Institutions.getViaApi().then((institutions) => {
    const institution = institutions.locinsts.find((inst) => inst.code === code);
    Campuses.getViaApi().then((campuses) => {
      const campus = campuses.loccamps.find((camp) => camp.institutionId === institution.id);
      Libraries.getViaApi().then((libraries) => {
        const library = libraries.loclibs.find((lib) => lib.campusId === campus.id);
        getViaApi().then((locations) => {
          const location = locations.locations.find((loc) => loc.libraryId === library.id);
          return location;
        });
      });
    });
  });
};

export default {
  getDefaultLocation,
  getSystemLocation,
  createViaApi: ({
    id,
    code,
    name,
    isActive,
    institutionId,
    campusId,
    libraryId,
    discoveryDisplayName,
    servicePointIds,
    primaryServicePoint,
  }) => {
    return cy
      .okapiRequest({
        path: 'locations',
        body: {
          id,
          code,
          name,
          isActive,
          institutionId,
          campusId,
          libraryId,
          discoveryDisplayName,
          servicePointIds,
          primaryServicePoint,
        },
        method: 'POST',
        isDefaultSearchParamsRequired: false,
      })
      .then((response) => {
        return response.body;
      });
  },

  deleteInstitutionCampusLibraryLocationViaApi: (
    institutionId,
    campusId,
    libraryId,
    locationId,
  ) => {
    cy.okapiRequest({
      path: `locations/${locationId}`,
      method: 'DELETE',
      isDefaultSearchParamsRequired: false,
      failOnStatusCode: false,
    });
    Libraries.deleteViaApi(libraryId);
    Campuses.deleteViaApi(campusId);
    Institutions.deleteViaApi(institutionId);
  },

  deleteViaApi: (locationId) => {
    cy.okapiRequest({
      path: `locations/${locationId}`,
      method: 'DELETE',
      isDefaultSearchParamsRequired: false,
    });
  },
};
