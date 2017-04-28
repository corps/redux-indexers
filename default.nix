{ pkgs ? import <nixpkgs> { inherit system; }, 
  system ? builtins.currentSystem,
  nodejs ? pkgs.nodejs }:

let 
  npmInputs = import ./nix-npm/packages.nix {
    inherit pkgs;
    inherit system;
    inherit nodejs;
    packages = [ "typescript" ];
  };
in

with pkgs;
stdenv.mkDerivation {
  name = "redux-indexers";
  buildInputs = npmInputs;
}
