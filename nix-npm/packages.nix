{ pkgs, 
  system,
  nodejs,
  packages }:

let
  lockDirConfig = {
    inherit pkgs;
    inherit packages;
    lockDir = ./packages.lock;
  };

  npmConfig = {
    inherit pkgs;
    inherit system;
    inherit nodejs;
  };

  npmpkgs = import ./lock.nix lockDirConfig npmConfig;
in

[ pkgs.nodePackages.node2nix pkgs.nodejs ] ++ map (a: builtins.getAttr a npmpkgs) packages
