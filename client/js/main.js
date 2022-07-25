import GeneratorApp from "./generator-app";
import Alpine from "alpinejs";

window.Alpine = Alpine;
Alpine.data("generatorApp", GeneratorApp);
Alpine.start();
