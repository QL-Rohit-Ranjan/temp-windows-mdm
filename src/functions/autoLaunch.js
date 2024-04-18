const AutoLaunch = require("auto-launch");

const makeAppAutoLaunch = (app) => {
  const autoLauncher = new AutoLaunch({
    name: "mdm_app",
    path: app.getPath("exe"),
  });
  autoLauncher.enable();
  autoLauncher
    .isEnabled()
    .then((isEnabled) => {
      if (isEnabled) return;
      autoLauncher.enable();
    })
    .catch((err) => {
      throw err;
    });
};

module.exports = makeAppAutoLaunch;
