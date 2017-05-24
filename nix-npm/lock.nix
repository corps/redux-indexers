{ pkgs, lockDir, packages }:

with pkgs;
let 
  buildPackagesLock = stdenv.mkDerivation rec {
    inherit packages;
    name = "node2nix-packages-lock";
    buildInputs = [ nodePackages.node2nix ];
    packagesJson = builtins.toJSON packages;
    packagesFile = builtins.toFile "package.json" packagesJson;
    src = ./.;
    buildPhase = ''
      mkdir opt
      cd opt
      node2nix -i $packagesFile
    '';
    installPhase = ''
      mkdir $out
      mv ./* $out/
      echo "To install the lockDir: cp -r $out ${toString lockDir}"
    '';
  };
  lockedPackages = if builtins.pathExists lockDir
    then import lockDir
    else import "${buildPackagesLock}"; in

lockedPackages
