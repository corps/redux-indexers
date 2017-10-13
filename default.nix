{ pkgs ? import <nixpkgs> { inherit system; }, 
  system ? builtins.currentSystem,
  nodejs ? pkgs.nodejs }:

with pkgs;
stdenv.mkDerivation {
  name = "redux-indexers";
  buildInputs = [ nodejs ];

  shellHook = ''
    PATH=$PWD/node_modules/.bin:$PATH
  '';
}
