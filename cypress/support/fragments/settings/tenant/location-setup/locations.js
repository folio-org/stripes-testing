import uuid from 'uuid';
import {
  Button,
  HTML,
  including,
  KeyValue,
  MultiColumnList,
  MultiColumnListCell,
  MultiColumnListRow,
  NavListItem,
  Pane,
  Select,
} from '../../../../../../interactors';
import getRandomPostfix from '../../../../utils/stringTools';
import TenantPane from '../baseTenantPane';
import ServicePoints from '../servicePoints/servicePoints';
import LocationDetails from '../locations/locationDetails';
import LocationEditForm from '../locations/locationEditForm';
import Campuses from './campuses';
import Institutions from './institutions';
import Libraries from './libraries';

const pane = Pane('Locations');
const actionsButton = Button('Actions');

const getDefaultLocation = ({
  servicePointId,
  institutionId = uuid(),
  campusId = uuid(),
  libraryId = uuid(),
  secondaryServicePointId,
  locationName,
} = {}) => {
  const institution = Institutions.getDefaultInstitution({
    id: institutionId,
    name: `autotest_institution_${getRandomPostfix()}`,
  });
  const campus = Campuses.getDefaultCampuse({
    id: campusId,
    name: `autotest_campuse_${getRandomPostfix()}`,
    institutionId: institution.id,
  });
  const library = Libraries.getDefaultLibrary({
    id: libraryId,
    name: `autotest_library_${getRandomPostfix()}`,
    campusId: campus.id,
  });
  const location = {
    id: uuid(),
    isActive: true,
    institutionId: institution.id,
    institutionName: institution.name,
    campusId: campus.id,
    campusName: campus.name,
    libraryId: library.id,
    libraryName: library.name,
    name: locationName || `autotest_location_name_${getRandomPostfix()}`,
    code: `autotest_location_code_${getRandomPostfix()}`,
    discoveryDisplayName: `autotest_name_${getRandomPostfix()}`,
    // servicePointIds must have real Servi point id
    servicePointIds: secondaryServicePointId
      ? [servicePointId, secondaryServicePointId]
      : [servicePointId],
    primaryServicePoint: servicePointId,
  };

  Institutions.createViaApi(institution).then(() => {
    Campuses.createViaApi(campus).then(() => {
      Libraries.createViaApi(library);
    });
  });
  return { institution, campus, library, location };
};

const addButton = Button('New');
const table = MultiColumnList({ id: 'locations-list' });

export default {
  ...TenantPane,
  openLTabFromSettingsList() {
    cy.do(NavListItem('Tenant').click());
    cy.do(NavListItem('Locations').click());
  },
  waitLoading() {
    TenantPane.waitLoading('Locations');
  },
  checkNoActionButtons() {
    cy.expect(addButton.absent());

    cy.do(table.click({ row: 0 }));
    LocationDetails.waitLoading();
    LocationDetails.checkActionButtonAbsent();
  },
  selectInstitution(content = 'KU') {
    cy.do(Select('Institution').choose(including(content)));
    cy.wait(500);
  },
  selectCampus(content = 'E)') {
    cy.do(Select('Campus').choose(including(content)));
    cy.wait(500);
  },
  selectLibrary(content = 'E)') {
    cy.do(Select('Library').choose(including(content)));
    cy.wait(500);
  },
  viewLocations(location) {
    TenantPane.selectOptions([
      {
        label: 'Institution',
        option: { name: location.institutionName, id: location.institutionId },
      },
      { label: 'Campus', option: { name: location.campusName, id: location.campusId } },
      { label: 'Library', option: { name: location.libraryName, id: location.libraryId } },
    ]);
  },
  openLocationDetails(location) {
    cy.do(table.find(MultiColumnListCell(location)).click());
    LocationDetails.waitLoading();

    return LocationDetails;
  },
  editLocation(location, values) {
    this.openLocationDetails(location);
    LocationDetails.openEditLocationForm();
    LocationEditForm.fillLocationForm(values);
  },
  createNewLocation() {
    cy.do(addButton.click());
  },

  getDefaultLocation,
  verifyRemoteStorageValue(value = 'RS1') {
    cy.expect(KeyValue('Remote storage').has({ value }));
  },
  deleteLocation(name) {
    cy.do([
      Pane('Locations')
        .find(MultiColumnListCell({ content: name }))
        .click(),
      actionsButton.click(),
      Button('Delete').click(),
      Button({ id: 'clickable-deletelocation-confirmation-confirm' }).click(),
    ]);
  },
  checkResultsTableContent(records) {
    TenantPane.checkResultsTableColumns(['Status', 'Name', 'Code'], table);
    this.checkLocationsTableContent(records);
  },
  checkLocationsTableContent(records = []) {
    cy.expect(addButton.has({ disabled: false }));

    records
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach((record, index) => {
        cy.expect([
          MultiColumnListRow({ index })
            .find(MultiColumnListCell({ columnIndex: 0 }))
            .has({ content: 'Active' }),
          MultiColumnListRow({ index })
            .find(MultiColumnListCell({ columnIndex: 1 }))
            .has({ content: record.name }),
          MultiColumnListRow({ index })
            .find(MultiColumnListCell({ columnIndex: 2 }))
            .has({ content: record.code }),
        ]);
      });
  },
  checkEmptyTableContent(isRequiredFieldsSelected) {
    cy.expect(addButton.has({ disabled: false }));
    if (!isRequiredFieldsSelected) {
      cy.expect([
        pane
          .find(HTML(including('Please select an institution, campus and library to continue.')))
          .exists(),
      ]);
    }
    cy.expect(pane.find(MultiColumnList()).absent());
  },
  getViaApi() {
    return TenantPane.getViaApi({ path: 'locations' });
  },
  getViaApiAnyDefault(limit = 1) {
    return cy
      .okapiRequest({
        path: 'locations',
        searchParams: { query: '(isActive=true and name<>"AT_*" and name<>"*auto*")', limit },
        isDefaultSearchParamsRequired: false,
      })
      .then((response) => {
        return response.body.locations;
      });
  },
  /**
   * Returns the active location "AT_Loc <tenantId>" ("AT_Loc_<index> <tenantId>" for index > 1),
   * code "AT_Loc_<tenantId>" ("AT_Loc_<index>_<tenantId>"), in the current tenant.
   * Creates it (with its own institution, campus and library) only if it does not exist yet.
   * The location is shared between specs and is never deleted.
   */
  getOrCreateTenantLocationViaApi(tenantId, index = 1) {
    const name = index > 1 ? `AT_Loc_${index} ${tenantId}` : `AT_Loc ${tenantId}`;
    const code = name.replace(' ', '_');
    // Yields an array: a callback returning undefined would make Cypress pass the previous subject on
    const findByCode = () =>
      cy
        .okapiRequest({
          path: 'locations',
          searchParams: { query: `code=="${code}"`, limit: 1 },
          isDefaultSearchParamsRequired: false,
        })
        .then(({ body }) => body.locations);

    return findByCode().then((existingLocations) => {
      if (existingLocations.length) return existingLocations[0];
      return ServicePoints.getViaApi({ limit: 1 }).then((servicePoints) => {
        const { location } = getDefaultLocation({
          servicePointId: servicePoints[0].id,
          locationName: name,
        });
        return cy
          .okapiRequest({
            method: 'POST',
            path: 'locations',
            body: {
              id: location.id,
              code,
              name,
              isActive: true,
              institutionId: location.institutionId,
              campusId: location.campusId,
              libraryId: location.libraryId,
              discoveryDisplayName: name,
              servicePointIds: location.servicePointIds,
              primaryServicePoint: location.primaryServicePoint,
            },
            isDefaultSearchParamsRequired: false,
            // the code is unique per tenant, so a parallel spec creating it first makes this fail
            failOnStatusCode: false,
          })
          .then(() => findByCode())
          .then((createdLocations) => {
            expect(createdLocations, `location ${name}`).to.have.length(1);
            return createdLocations[0];
          });
      });
    });
  },
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
    return TenantPane.createViaApi({
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
    });
  },
  deleteViaApi({ id, libraryId, campusId, institutionId }) {
    return TenantPane.deleteViaApi({ path: `locations/${id}` }).then(() => {
      if (libraryId) {
        Libraries.deleteViaApi(libraryId);
      }
      if (campusId) {
        Campuses.deleteViaApi(campusId);
      }
      if (institutionId) {
        Institutions.deleteViaApi(institutionId);
      }
    });
  },
  deleteLocationViaApi(locationId) {
    return TenantPane.deleteViaApi({ path: `locations/${locationId}` });
  },
  goToLocationsTab() {
    cy.do(NavListItem('Tenant').click());
    cy.expect(Pane('Tenant').exists());
    cy.do(NavListItem('Locations').click());
    cy.expect(Pane('Locations').exists());
  },
  duplicate() {
    cy.do([actionsButton.click(), Button('Duplicate').click()]);
    cy.wait(1000);
  },
};
