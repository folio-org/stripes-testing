import uuid from 'uuid';
import { including } from '@interactors/html';
import getRandomPostfix from '../../../../utils/stringTools';
import { Button, MultiColumnListCell, Pane, Select } from '../../../../../../interactors';
import keyValue from '../../../../../../interactors/key-value';
import { REQUEST_METHOD } from '../../../../constants';
import Institutions from '../institutions';
import Campuses from '../campuses';

const getDefaultLocation = (servicePointId, institutionId, campuseId, libraryId) => {
  const defaulLocation = {
    id: uuid(),
    isActive: true,
    institutionId: '',
    campusId: '',
    libraryId: '',
    servicePointIds: [servicePointId],
    name: `autotest_location_name_${getRandomPostfix()}`,
    code: `autotest_location_code_${getRandomPostfix()}`,
    discoveryDisplayName: `autotest_name_${getRandomPostfix()}`,
    primaryServicePoint: servicePointId,
  };
  if (!institutionId) {
    cy.okapiRequest({
      method: REQUEST_METHOD.POST,
      path: 'location-units/institutions',
      body: Institutions.defaultUiInstitutions,
    })
      .then(locinsts => {
        defaulLocation.institutionId = locinsts[0].id;
      });
  }
  if (!campuseId) {
    cy.okapiRequest({
      method: REQUEST_METHOD.POST,
      path: 'location-units/campuses',
      body: { ...Campuses.defaultUiCampuses, institutionId: Institutions.defaultUiInstitutions.body.id }
    })
      .then(loccamps => {
        defaulLocation.campusId = loccamps[0].id;
      });
  }
  if (!libraryId) {
    cy.okapiRequest({
      method: REQUEST_METHOD.POST,
      path: 'location-units/libraries',
      body: { ...Campuses.defaultUiCampuses, campuseId: Campuses.defaultUiCampuses.body.id }
    })
      .then(loclibs => {
        defaulLocation.libraryId = loclibs[0].id;
      });
  }
  return defaulLocation;
};

export default {
  getDefaultLocation,

  selectInstitution() {
    cy.do(Select('Institution').choose(including('KU')));
  },
  selectCampus() {
    cy.do(Select('Campus').choose(including('(E)')));
  },
  selectLibrary() {
    cy.do(Select('Library').choose(including('(E)')));
  },
  createNewLocation() {
    cy.do(Button('New').click());
  },
  verifyRemoteStorageValue(value = 'RS1') {
    cy.expect(keyValue('Remote storage').has({ value }));
  },
  deleteLocation(name) {
    cy.do([
      Pane('Locations').find(MultiColumnListCell({ content: name })).click(),
      Button('Actions').click(),
      Button('Delete').click(),
      Button({ id: 'clickable-deletelocation-confirmation-confirm' }).click()
    ]);
  },
};
