
class TestPage extends CpiPage {
    constructor() {
        super();

        Cpi.ShowAlert("Quod erat optandum maxime iudices et quod ad inuidiam uestri ordinis infamiamque iudiciorum uestrorum maxime pertinabet");
    }
}


window.page = new TestPage();
