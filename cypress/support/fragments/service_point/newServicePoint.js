
import uuid from 'uuid';
import getRandomPostfix from '../../utils/stringTools';


export default {

  servicePointId: uuid(),
  institutionsId: uuid(),
  campusesId: uuid(),
  librariesId: uuid(),
  locationsId: uuid(),
  uuid:uuid(),
  servicePointName: `autotest_service_${getRandomPostfix()}`,

  servicePoint() {
    this.newServicePoint();
    this.newInstitutions();
    this.newCampuses();
    this.newLibraries();
    this.newLocations();
  },

  deleteServicePoint() {
    this.deleteLocations();
    this.deleteLibraries();
    this.deleteCampuses();
    this.deleteInstitutions();
    this.deleteNewServicePoint();
  },

  newServicePoint() {
    return cy.okapiRequest({
      method: 'POST',
      path: 'service-points',
      body: {
        code: `autotest_code_${getRandomPostfix()}`,
        discoveryDisplayName: `autotest_discovery_display_name_${getRandomPostfix()}`,
        id: this.servicePointId,
        name: this.servicePointName,
      }
    })
      .then((resp) => {
        expect(resp.body).property('id');
      });
  },
  newInstitutions() {
    return cy.okapiRequest({
      method: 'POST',
      path: 'location-units/institutions',
      body: {
        code: `autotest_code_${getRandomPostfix()}`,
        id: this.institutionsId,
        name: `autotest_name_${getRandomPostfix()}`,
      }
    })
      .then((resp) => {
        expect(resp.body).property('id');
      });
  },
  newCampuses() {
    return cy.okapiRequest({
      method: 'POST',
      path: 'location-units/campuses',
      body: {
        code: `autotest_code_${getRandomPostfix()}`,
        id: this.campusesId,
        institutionId: this.institutionsId,
        name: `autotest_name_${getRandomPostfix()}`,
      }
    })
      .then((resp) => {
        expect(resp.body).property('id');
      });
  },
  newLibraries() {
    return cy.okapiRequest({
      method: 'POST',
      path: 'location-units/libraries',
      body: {
        campusId: this.campusesId,
        code: `autotest_code_${getRandomPostfix()}`,
        id: this.librariesId,
        name: `autotest_name_${getRandomPostfix()}`,

      }
    })
      .then((resp) => {
        expect(resp.body).property('id');
      });
  },
  newLocations() {
    return cy.okapiRequest({
      method: 'POST',
      path: 'locations',
      body: {
        campusId: this.campusesId,
        code: `autotest_code_${getRandomPostfix()}`,
        discoveryDisplayName: `autotest_discovery_display_name_${getRandomPostfix()}`,
        id: this.locationsId,
        institutionId: this.institutionsId,
        isActive: true,
        libraryId: this.librariesId,
        name: `autotest_name_${getRandomPostfix()}`,
        primaryServicePoint: this.servicePointId,
        servicePointIds: [
          this.servicePointId
        ]
      }
    })
      .then((resp) => {
        expect(resp.body).property('id');
      });
  },
  deleteLocations() {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `locations/${this.locationsId}`,
    });
  },
  deleteLibraries() {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `location-units/libraries/${this.librariesId}`,
    });
  },
  deleteCampuses() {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `location-units/campuses/${this.campusesId}`,
    });
  },
  deleteInstitutions() {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `location-units/institutions/${this.institutionsId}`,
    });
  },
  deleteNewServicePoint() {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `service-points/${this.servicePointId}`,
    });
  }
};

