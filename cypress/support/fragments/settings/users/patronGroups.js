import getRandomPostfix from '../../../utils/stringTools';

export default {
    defaultPatronGroup : {
        'group': `Patron_group_${getRandomPostfix()}`,
        'desc': 'Patron_group_description',
        'expirationOffsetInDays': '10'
    },
    createViaApi(defaultPatronGroup) {
        cy.okapiRequest({
            method: 'POST',
            path: 'groups',
            body: defaultPatronGroup
        })
    }
}