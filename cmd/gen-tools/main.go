package main

import (
	"flag"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"

	"github.com/lspecian/maas-mcp-server/cmd/gen-tools/generator"
	"github.com/lspecian/maas-mcp-server/cmd/gen-tools/parser"
)

const maasApiDocumentationText = `
Canonical MAAS
How it works
Install
Docs
Learn
Forum
Search documentation
Search
Home
Tutorial: MAAS in thirty minutes
How-to guides

Reference

Explanation

Machine basics
The machine life-cycle
Commissioning machines
Commissioning scripts
Machine customization
Deploying machines
Deploying running machines
LXD projects
Machine groups
Networking
Controllers
Images
Performance
Events
Logging
Security
MAAS API
Restful MAAS API.

This is the documentation for the API that lets you control and query MAAS. The API is "Restful", which means that you access it through normal HTTP requests.

API versions
At any given time, MAAS may support multiple versions of its API. The version number is included in the API's URL, e.g. /api/2.0/

For now, 2.0 is the only supported version.

The current API version number can be retrieved by issuing a GET to "/api/version/". Accessing an old or unknown API version URL will result in a "410 GONE" being returned, along with a descriptive error message. Both the error message and the api version are returned as plaintext.

HTTP methods and parameter-passing
The following HTTP methods are available for accessing the API:

GET (for information retrieval and queries),
POST (for asking the system to do things),
PUT (for updating objects), and
DELETE (for deleting objects).
All methods except DELETE may take parameters, but they are not all passed in the same way. GET parameters are passed in the URL, as is normal with a GET: "/item/?foo=bar" passes parameter "foo" with value "bar".

POST and PUT are different. Your request should have MIME type "multipart/form-data"; each part represents one parameter (for POST) or attribute (for PUT). Each part is named after the parameter or attribute it contains, and its contents are the conveyed value.

All parameters are in text form. If you need to submit binary data to the API, don't send it as any MIME binary format; instead, send it as a plain text part containing base64-encoded data.

Most resources offer a choice of GET or POST operations. In those cases these methods will take one special parameter, called op, to indicate what it is you want to do.

For example, to list all machines, you might GET "/MAAS/api/2.0/machines/".

Operations
Logged-in user
POST /MAAS/api/2.0/account/op-create_authorisation_token: Create an authorisation token
POST /MAAS/api/2.0/account/op-delete_authorisation_token: Delete an authorisation token
GET /MAAS/api/2.0/account/op-list_authorisation_tokens: List authorisation tokens
POST /MAAS/api/2.0/account/op-update_token_name: Modify authorisation token
SSH Keys
GET /MAAS/api/2.0/account/prefs/sshkeys/: List SSH keys
POST /MAAS/api/2.0/account/prefs/sshkeys/: Add a new SSH key
POST /MAAS/api/2.0/account/prefs/sshkeys/op-import: Import SSH keys
SSH Key
DELETE /MAAS/api/2.0/account/prefs/sshkeys/{id}/: Delete an SSH key
GET /MAAS/api/2.0/account/prefs/sshkeys/{id}/: Retrieve an SSH key
SSL Keys
GET /MAAS/api/2.0/account/prefs/sslkeys/: List keys
POST /MAAS/api/2.0/account/prefs/sslkeys/: Add a new SSL key
SSL Key
DELETE /MAAS/api/2.0/account/prefs/sslkeys/{id}/: Delete an SSL key
GET /MAAS/api/2.0/account/prefs/sslkeys/{id}/: Retrieve an SSL key
Boot resources
GET /MAAS/api/2.0/boot-resources/: List boot resources
POST /MAAS/api/2.0/boot-resources/: Upload a new boot resource
POST /MAAS/api/2.0/boot-resources/op-import: Import boot resources
GET /MAAS/api/2.0/boot-resources/op-is_importing: Importing status
POST /MAAS/api/2.0/boot-resources/op-stop_import: Stop import boot resources
Boot resource
DELETE /MAAS/api/2.0/boot-resources/{id}/: Delete a boot resource
GET /MAAS/api/2.0/boot-resources/{id}/: Read a boot resource
Boot sources
GET /MAAS/api/2.0/boot-sources/: List boot sources
POST /MAAS/api/2.0/boot-sources/: Create a boot source
Boot source selections
GET /MAAS/api/2.0/boot-sources/{boot_source_id}/selections/: List boot-source selections
POST /MAAS/api/2.0/boot-sources/{boot_source_id}/selections/: Create a boot-source selection
Boot source selection
DELETE /MAAS/api/2.0/boot-sources/{boot_source_id}/selections/{id}/: Delete a boot source
GET /MAAS/api/2.0/boot-sources/{boot_source_id}/selections/{id}/: Read a boot source selection
PUT /MAAS/api/2.0/boot-sources/{boot_source_id}/selections/{id}/: Update a boot-source selection
Boot source
DELETE /MAAS/api/2.0/boot-sources/{id}/: Delete a boot source
GET /MAAS/api/2.0/boot-sources/{id}/: Read a boot source
PUT /MAAS/api/2.0/boot-sources/{id}/: Update a boot source
Commissioning scripts (deprecated)
GET /MAAS/api/2.0/commissioning-scripts/: CommissioningScriptsHandler read
POST /MAAS/api/2.0/commissioning-scripts/: CommissioningScriptsHandler create
Commissioning script (deprecated)
DELETE /MAAS/api/2.0/commissioning-scripts/{name}: CommissioningScriptHandler delete
GET /MAAS/api/2.0/commissioning-scripts/{name}: CommissioningScriptHandler read
PUT /MAAS/api/2.0/commissioning-scripts/{name}: CommissioningScriptHandler update
Devices
GET /MAAS/api/2.0/devices/: List Nodes visible to the user
POST /MAAS/api/2.0/devices/: Create a new device
GET /MAAS/api/2.0/devices/op-is_registered: MAC address registered
POST /MAAS/api/2.0/devices/op-set_zone: Assign nodes to a zone
Device
DELETE /MAAS/api/2.0/devices/{system_id}/: Delete a device
GET /MAAS/api/2.0/devices/{system_id}/: Read a node
PUT /MAAS/api/2.0/devices/{system_id}/: Update a device
GET /MAAS/api/2.0/devices/{system_id}/op-details: Get system details
GET /MAAS/api/2.0/devices/{system_id}/op-power_parameters: Get power parameters
POST /MAAS/api/2.0/devices/{system_id}/op-restore_default_configuration: Reset device configuration
POST /MAAS/api/2.0/devices/{system_id}/op-restore_networking_configuration: Reset networking options
POST /MAAS/api/2.0/devices/{system_id}/op-set_owner_data: Deprecated, use set-workload-annotations.
POST /MAAS/api/2.0/devices/{system_id}/op-set_workload_annotations: Set key=value data
DHCP Snippets (deprecated)
GET /MAAS/api/2.0/dhcp-snippets/: List DHCP snippets
POST /MAAS/api/2.0/dhcp-snippets/: Create a DHCP snippet
DHCP Snippet (deprecated)
DELETE /MAAS/api/2.0/dhcp-snippets/{id}/: Delete a DHCP snippet
GET /MAAS/api/2.0/dhcp-snippets/{id}/: Read a DHCP snippet
PUT /MAAS/api/2.0/dhcp-snippets/{id}/: Update a DHCP snippet
POST /MAAS/api/2.0/dhcp-snippets/{id}/op-revert: Revert DHCP snippet to earlier version
Discoveries
GET /MAAS/api/2.0/discovery/: List all discovered devices
GET /MAAS/api/2.0/discovery/op-by_unknown_ip: List all discovered devices with an unknown IP address
GET /MAAS/api/2.0/discovery/op-by_unknown_ip_and_mac: Lists all discovered devices completely unknown to MAAS
GET /MAAS/api/2.0/discovery/op-by_unknown_mac: List all discovered devices with unknown MAC
POST /MAAS/api/2.0/discovery/op-clear: Delete all discovered neighbours
POST /MAAS/api/2.0/discovery/op-clear_by_mac_and_ip: Delete discoveries that match a MAC and IP
POST /MAAS/api/2.0/discovery/op-scan: Run discovery scan on rack networks
Discovery
GET /MAAS/api/2.0/discovery/{discovery_id}/: Read a discovery
DNSResourceRecords
GET /MAAS/api/2.0/dnsresourcerecords/: List all DNS resource records
POST /MAAS/api/2.0/dnsresourcerecords/: Create a DNS resource record
DNSResourceRecord
DELETE /MAAS/api/2.0/dnsresourcerecords/{id}/: Delete a DNS resource record
GET /MAAS/api/2.0/dnsresourcerecords/{id}/: Read a DNS resource record description Read a DNS resource record with the given id.
PUT /MAAS/api/2.0/dnsresourcerecords/{id}/: Update a DNS resource record
DNSResources
GET /MAAS/api/2.0/dnsresources/: List resources
POST /MAAS/api/2.0/dnsresources/: Create a DNS resource
DNSResource
DELETE /MAAS/api/2.0/dnsresources/{id}/: Delete a DNS resource
GET /MAAS/api/2.0/dnsresources/{id}/: Read a DNS resource
PUT /MAAS/api/2.0/dnsresources/{id}/: Update a DNS resource
Domains
GET /MAAS/api/2.0/domains/: List all domains
POST /MAAS/api/2.0/domains/: Create a domain
POST /MAAS/api/2.0/domains/op-set_serial: Set the SOA serial number
Domain
DELETE /MAAS/api/2.0/domains/{id}/: Delete domain
GET /MAAS/api/2.0/domains/{id}/: Read domain
PUT /MAAS/api/2.0/domains/{id}/: Update a domain
POST /MAAS/api/2.0/domains/{id}/op-set_default: Set domain as default
Events
GET /MAAS/api/2.0/events/op-query: List node events
Fabrics
GET /MAAS/api/2.0/fabrics/: List fabrics
POST /MAAS/api/2.0/fabrics/: Create a fabric
VLANs
GET /MAAS/api/2.0/fabrics/{fabric_id}/vlans/: List VLANs
POST /MAAS/api/2.0/fabrics/{fabric_id}/vlans/: Create a VLAN
VLAN
DELETE /MAAS/api/2.0/fabrics/{fabric_id}/vlans/{vid}/: Delete a VLAN
GET /MAAS/api/2.0/fabrics/{fabric_id}/vlans/{vid}/: Retrieve VLAN
PUT /MAAS/api/2.0/fabrics/{fabric_id}/vlans/{vid}/: Update VLAN
Fabric
DELETE /MAAS/api/2.0/fabrics/{id}/: Delete a fabric
GET /MAAS/api/2.0/fabrics/{id}/: Read a fabric
PUT /MAAS/api/2.0/fabrics/{id}/: Update fabric
Files
DELETE /MAAS/api/2.0/files/: Delete a file
GET /MAAS/api/2.0/files/: List files
POST /MAAS/api/2.0/files/: Add a new file
GET /MAAS/api/2.0/files/op-get: Get a named file
GET /MAAS/api/2.0/files/op-get_by_key: Get a file by key
File
DELETE /MAAS/api/2.0/files/{filename}/: Delete a file
GET /MAAS/api/2.0/files/{filename}/: Read a stored file
Commissioning results
GET /MAAS/api/2.0/installation-results/: Read commissioning results
IP Addresses
GET /MAAS/api/2.0/ipaddresses/: List IP addresses
POST /MAAS/api/2.0/ipaddresses/op-release: Release an IP address
POST /MAAS/api/2.0/ipaddresses/op-reserve: Reserve an IP address
IP Ranges
GET /MAAS/api/2.0/ipranges/: List all IP ranges
POST /MAAS/api/2.0/ipranges/: Create an IP range
IP Range
DELETE /MAAS/api/2.0/ipranges/{id}/: Delete an IP range
GET /MAAS/api/2.0/ipranges/{id}/: Read an IP range
PUT /MAAS/api/2.0/ipranges/{id}/: Update an IP range
License Key
DELETE /MAAS/api/2.0/license-key/{osystem}/{distro_series}: Delete license key
GET /MAAS/api/2.0/license-key/{osystem}/{distro_series}: Read license key
PUT /MAAS/api/2.0/license-key/{osystem}/{distro_series}: Update license key
License Keys
GET /MAAS/api/2.0/license-keys/: List license keys
POST /MAAS/api/2.0/license-keys/: Define a license key
MAAS server
GET /MAAS/api/2.0/maas/op-get_config: Get a configuration value
POST /MAAS/api/2.0/maas/op-set_config: Set a configuration value
Machines
GET /MAAS/api/2.0/machines/: List Nodes visible to the user
POST /MAAS/api/2.0/machines/: Create a new machine
POST /MAAS/api/2.0/machines/op-accept: Accept declared machines
POST /MAAS/api/2.0/machines/op-accept_all: Accept all declared machines
POST /MAAS/api/2.0/machines/op-add_chassis: Add special hardware
POST /MAAS/api/2.0/machines/op-allocate: Allocate a machine
POST /MAAS/api/2.0/machines/op-clone: Clone storage and/or interface configurations
GET /MAAS/api/2.0/machines/op-is_registered: MAC address registered
GET /MAAS/api/2.0/machines/op-list_allocated: List allocated
GET /MAAS/api/2.0/machines/op-power_parameters: Get power parameters
POST /MAAS/api/2.0/machines/op-release: Release machines
POST /MAAS/api/2.0/machines/op-set_zone: Assign nodes to a zone
Machine
DELETE /MAAS/api/2.0/machines/{system_id}/: Delete a machine
GET /MAAS/api/2.0/machines/{system_id}/: Read a node
PUT /MAAS/api/2.0/machines/{system_id}/: Update a machine
POST /MAAS/api/2.0/machines/{system_id}/op-abort: Abort a node operation
POST /MAAS/api/2.0/machines/{system_id}/op-clear_default_gateways: Clear set default gateways
POST /MAAS/api/2.0/machines/{system_id}/op-commission: Commission a machine
POST /MAAS/api/2.0/machines/{system_id}/op-deploy: Deploy a machine
GET /MAAS/api/2.0/machines/{system_id}/op-details: Get system details
POST /MAAS/api/2.0/machines/{system_id}/op-exit_rescue_mode: Exit rescue mode
GET /MAAS/api/2.0/machines/{system_id}/op-get_curtin_config: Get curtin configuration
GET /MAAS/api/2.0/machines/{system_id}/op-get_token: Get a machine token
POST /MAAS/api/2.0/machines/{system_id}/op-lock: Lock a machine
POST /MAAS/api/2.0/machines/{system_id}/op-mark_broken: Mark a machine as Broken
POST /MAAS/api/2.0/machines/{system_id}/op-mark_fixed: Mark a machine as Fixed
POST /MAAS/api/2.0/machines/{system_id}/op-mount_special: Mount a special-purpose filesystem
POST /MAAS/api/2.0/machines/{system_id}/op-override_failed_testing: Ignore failed tests
POST /MAAS/api/2.0/machines/{system_id}/op-power_off: Power off a node
POST /MAAS/api/2.0/machines/{system_id}/op-power_on: Turn on a node
GET /MAAS/api/2.0/machines/{system_id}/op-power_parameters: Get power parameters
GET /MAAS/api/2.0/machines/{system_id}/op-query_power_state: Get the power state of a node
POST /MAAS/api/2.0/machines/{system_id}/op-release: Release a machine
POST /MAAS/api/2.0/machines/{system_id}/op-rescue_mode: Enter rescue mode
POST /MAAS/api/2.0/machines/{system_id}/op-restore_default_configuration: Restore default configuration
POST /MAAS/api/2.0/machines/{system_id}/op-restore_networking_configuration: Restore networking options
POST /MAAS/api/2.0/machines/{system_id}/op-restore_storage_configuration: Restore storage configuration
POST /MAAS/api/2.0/machines/{system_id}/op-set_owner_data: Deprecated, use set-workload-annotations.
POST /MAAS/api/2.0/machines/{system_id}/op-set_storage_layout: Change storage layout
POST /MAAS/api/2.0/machines/{system_id}/op-set_workload_annotations: Set key=value data
POST /MAAS/api/2.0/machines/{system_id}/op-test: Begin testing process for a node
POST /MAAS/api/2.0/machines/{system_id}/op-unlock: Unlock a machine
POST /MAAS/api/2.0/machines/{system_id}/op-unmount_special: Unmount a special-purpose filesystem
Networks (deprecated)
GET /MAAS/api/2.0/networks/: NetworksHandler read
POST /MAAS/api/2.0/networks/: NetworksHandler create
Network (deprecated)
DELETE /MAAS/api/2.0/networks/{name}/: NetworkHandler delete
GET /MAAS/api/2.0/networks/{name}/: NetworkHandler read
PUT /MAAS/api/2.0/networks/{name}/: NetworkHandler update
POST /MAAS/api/2.0/networks/{name}/op-connect_macs: NetworkHandler connect_macs
POST /MAAS/api/2.0/networks/{name}/op-disconnect_macs: NetworkHandler disconnect_macs
GET /MAAS/api/2.0/networks/{name}/op-list_connected_macs: NetworkHandler list_connected_macs
Nodes
GET /MAAS/api/2.0/nodes/: List Nodes visible to the user
GET /MAAS/api/2.0/nodes/op-is_registered: MAC address registered
POST /MAAS/api/2.0/nodes/op-set_zone: Assign nodes to a zone
Node
DELETE /MAAS/api/2.0/nodes/{system_id}/: Delete a node
GET /MAAS/api/2.0/nodes/{system_id}/: Read a node
GET /MAAS/api/2.0/nodes/{system_id}/op-details: Get system details
GET /MAAS/api/2.0/nodes/{system_id}/op-power_parameters: Get power parameters
Bcache Cache Set
DELETE /MAAS/api/2.0/nodes/{system_id}/bcache-cache-set/{id}/: Delete a bcache set
GET /MAAS/api/2.0/nodes/{system_id}/bcache-cache-set/{id}/: Read a bcache cache set
PUT /MAAS/api/2.0/nodes/{system_id}/bcache-cache-set/{id}/: Update a bcache set
Bcache Cache Sets
GET /MAAS/api/2.0/nodes/{system_id}/bcache-cache-sets/: List bcache sets
POST /MAAS/api/2.0/nodes/{system_id}/bcache-cache-sets/: Creates a bcache cache set
Bcache Device
DELETE /MAAS/api/2.0/nodes/{system_id}/bcache/{id}/: Delete a bcache
GET /MAAS/api/2.0/nodes/{system_id}/bcache/{id}/: Read a bcache device
PUT /MAAS/api/2.0/nodes/{system_id}/bcache/{id}/: Update a bcache
Bcache Devices
GET /MAAS/api/2.0/nodes/{system_id}/bcaches/: List all bcache devices
POST /MAAS/api/2.0/nodes/{system_id}/bcaches/: Creates a bcache
Block devices
GET /MAAS/api/2.0/nodes/{system_id}/blockdevices/: List block devices
POST /MAAS/api/2.0/nodes/{system_id}/blockdevices/: Create a block device
Partitions
DELETE /MAAS/api/2.0/nodes/{system_id}/blockdevices/{device_id}/partition/{id}: Delete a partition
GET /MAAS/api/2.0/nodes/{system_id}/blockdevices/{device_id}/partition/{id}: Read a partition
POST /MAAS/api/2.0/nodes/{system_id}/blockdevices/{device_id}/partition/{id}op-add_tag: Add a tag
POST /MAAS/api/2.0/nodes/{system_id}/blockdevices/{device_id}/partition/{id}op-format: Format a partition
POST /MAAS/api/2.0/nodes/{system_id}/blockdevices/{device_id}/partition/{id}op-mount: Mount a filesystem
POST /MAAS/api/2.0/nodes/{system_id}/blockdevices/{device_id}/partition/{id}op-remove_tag: Remove a tag
POST /MAAS/api/2.0/nodes/{system_id}/blockdevices/{device_id}/partition/{id}op-unformat: Unformat a partition
POST /MAAS/api/2.0/nodes/{system_id}/blockdevices/{device_id}/partition/{id}op-unmount: Unmount a filesystem
GET /MAAS/api/2.0/nodes/{system_id}/blockdevices/{device_id}/partitions/: List partitions
POST /MAAS/api/2.0/nodes/{system_id}/blockdevices/{device_id}/partitions/: Create a partition
Block device
DELETE /MAAS/api/2.0/nodes/{system_id}/blockdevices/{id}/: Delete a block device
GET /MAAS/api/2.0/nodes/{system_id}/blockdevices/{id}/: Read a block device
PUT /MAAS/api/2.0/nodes/{system_id}/blockdevices/{id}/: Update a block device
POST /MAAS/api/2.0/nodes/{system_id}/blockdevices/{id}/op-add_tag: Add a tag
POST /MAAS/api/2.0/nodes/{system_id}/blockdevices/{id}/op-format: Format block device
POST /MAAS/api/2.0/nodes/{system_id}/blockdevices/{id}/op-mount: Mount a filesystem
POST /MAAS/api/2.0/nodes/{system_id}/blockdevices/{id}/op-remove_tag: Remove a tag
POST /MAAS/api/2.0/nodes/{system_id}/blockdevices/{id}/op-set_boot_disk: Set boot disk
POST /MAAS/api/2.0/nodes/{system_id}/blockdevices/{id}/op-unformat: Unformat a block device
POST /MAAS/api/2.0/nodes/{system_id}/blockdevices/{id}/op-unmount: Unmount a filesystem
Node Devices
GET /MAAS/api/2.0/nodes/{system_id}/devices/: Return node devices
Node Device
DELETE /MAAS/api/2.0/nodes/{system_id}/devices/{id}/: Delete a node device
GET /MAAS/api/2.0/nodes/{system_id}/devices/{id}/: Return a specific node device
Interfaces
GET /MAAS/api/2.0/nodes/{system_id}/interfaces/: List interfaces
POST /MAAS/api/2.0/nodes/{system_id}/interfaces/op-create_bond: Create a bond inteface
POST /MAAS/api/2.0/nodes/{system_id}/interfaces/op-create_bridge: Create a bridge interface
POST /MAAS/api/2.0/nodes/{system_id}/interfaces/op-create_physical: Create a physical interface
POST /MAAS/api/2.0/nodes/{system_id}/interfaces/op-create_vlan: Create a VLAN interface
Interface
DELETE /MAAS/api/2.0/nodes/{system_id}/interfaces/{id}/: Delete an interface
GET /MAAS/api/2.0/nodes/{system_id}/interfaces/{id}/: Read an interface
PUT /MAAS/api/2.0/nodes/{system_id}/interfaces/{id}/: Update an interface
POST /MAAS/api/2.0/nodes/{system_id}/interfaces/{id}/op-add_tag: Add a tag to an interface
POST /MAAS/api/2.0/nodes/{system_id}/interfaces/{id}/op-disconnect: Disconnect an interface
POST /MAAS/api/2.0/nodes/{system_id}/interfaces/{id}/op-link_subnet: Link interface to a subnet
POST /MAAS/api/2.0/nodes/{system_id}/interfaces/{id}/op-remove_tag: Remove a tag from an interface
POST /MAAS/api/2.0/nodes/{system_id}/interfaces/{id}/op-set_default_gateway: Set the default gateway on a machine
POST /MAAS/api/2.0/nodes/{system_id}/interfaces/{id}/op-unlink_subnet: Unlink interface from subnet
RAID Device
DELETE /MAAS/api/2.0/nodes/{system_id}/raid/{id}/: Delete a RAID
GET /MAAS/api/2.0/nodes/{system_id}/raid/{id}/: Read a RAID
PUT /MAAS/api/2.0/nodes/{system_id}/raid/{id}/: Update a RAID
RAID Devices
GET /MAAS/api/2.0/nodes/{system_id}/raids/: List all RAIDs
POST /MAAS/api/2.0/nodes/{system_id}/raids/: Set up a RAID
Node Script Result
GET /MAAS/api/2.0/nodes/{system_id}/results/: Return script results
DELETE /MAAS/api/2.0/nodes/{system_id}/results/{id}/: Delete script results
GET /MAAS/api/2.0/nodes/{system_id}/results/{id}/: Get specific script result
PUT /MAAS/api/2.0/nodes/{system_id}/results/{id}/: Update specific script result
GET /MAAS/api/2.0/nodes/{system_id}/results/{id}/op-download: Download script results
VMFS datastore
DELETE /MAAS/api/2.0/nodes/{system_id}/vmfs-datastore/{id}/: Delete the specified VMFS datastore.
GET /MAAS/api/2.0/nodes/{system_id}/vmfs-datastore/{id}/: Read a VMFS datastore.
PUT /MAAS/api/2.0/nodes/{system_id}/vmfs-datastore/{id}/: Update a VMFS datastore.
VMFS datastores
GET /MAAS/api/2.0/nodes/{system_id}/vmfs-datastores/: List all VMFS datastores.
POST /MAAS/api/2.0/nodes/{system_id}/vmfs-datastores/: Create a VMFS datastore.
Volume group
DELETE /MAAS/api/2.0/nodes/{system_id}/volume-group/{id}/: Delete volume group
GET /MAAS/api/2.0/nodes/{system_id}/volume-group/{id}/: Read a volume group
PUT /MAAS/api/2.0/nodes/{system_id}/volume-group/{id}/: Update a volume group
POST /MAAS/api/2.0/nodes/{system_id}/volume-group/{id}/op-create_logical_volume: Create a logical volume
POST /MAAS/api/2.0/nodes/{system_id}/volume-group/{id}/op-delete_logical_volume: Delete a logical volume
Volume groups
GET /MAAS/api/2.0/nodes/{system_id}/volume-groups/: List all volume groups
POST /MAAS/api/2.0/nodes/{system_id}/volume-groups/: Create a volume group
Notifications
GET /MAAS/api/2.0/notifications/: List notifications
POST /MAAS/api/2.0/notifications/: Create a notification
Notification
DELETE /MAAS/api/2.0/notifications/{id}/: Delete a notification
GET /MAAS/api/2.0/notifications/{id}/: Read a notification
PUT /MAAS/api/2.0/notifications/{id}/: Update a notification
POST /MAAS/api/2.0/notifications/{id}/op-dismiss: Dismiss a notification
Package Repositories
GET /MAAS/api/2.0/package-repositories/: List package repositories
POST /MAAS/api/2.0/package-repositories/: Create a package repository
Package Repository
DELETE /MAAS/api/2.0/package-repositories/{id}/: Delete a package repository
GET /MAAS/api/2.0/package-repositories/{id}/: Read a package repository
PUT /MAAS/api/2.0/package-repositories/{id}/: Update a package repository
Pods (deprecated)
GET /MAAS/api/2.0/pods/: List VM hosts
POST /MAAS/api/2.0/pods/: Create a VM host
Pod (deprecated)
DELETE /MAAS/api/2.0/pods/{id}/: Deletes a VM host
GET /MAAS/api/2.0/pods/{id}/: PodHandler read
PUT /MAAS/api/2.0/pods/{id}/: Update a specific VM host
POST /MAAS/api/2.0/pods/{id}/op-add_tag: Add a tag to a VM host
POST /MAAS/api/2.0/pods/{id}/op-compose: Compose a virtual machine on the host.
GET /MAAS/api/2.0/pods/{id}/op-parameters: Obtain VM host parameters
POST /MAAS/api/2.0/pods/{id}/op-refresh: Refresh a VM host
POST /MAAS/api/2.0/pods/{id}/op-remove_tag: Remove a tag from a VM host
RackControllers
GET /MAAS/api/2.0/rackcontrollers/: List Nodes visible to the user
GET /MAAS/api/2.0/rackcontrollers/op-describe_power_types: Get power information from rack controllers
POST /MAAS/api/2.0/rackcontrollers/op-import_boot_images: Import boot images on all rack controllers
GET /MAAS/api/2.0/rackcontrollers/op-is_registered: MAC address registered
GET /MAAS/api/2.0/rackcontrollers/op-power_parameters: Get power parameters
POST /MAAS/api/2.0/rackcontrollers/op-set_zone: Assign nodes to a zone
RackController
DELETE /MAAS/api/2.0/rackcontrollers/{system_id}/: Delete a rack controller
GET /MAAS/api/2.0/rackcontrollers/{system_id}/: Read a node
PUT /MAAS/api/2.0/rackcontrollers/{system_id}/: Update a rack controller
POST /MAAS/api/2.0/rackcontrollers/{system_id}/op-abort: Abort a node operation
GET /MAAS/api/2.0/rackcontrollers/{system_id}/op-details: Get system details
POST /MAAS/api/2.0/rackcontrollers/{system_id}/op-import_boot_images: Import boot images
GET /MAAS/api/2.0/rackcontrollers/{system_id}/op-list_boot_images: List available boot images
POST /MAAS/api/2.0/rackcontrollers/{system_id}/op-override_failed_testing: Ignore failed tests
POST /MAAS/api/2.0/rackcontrollers/{system_id}/op-power_off: Power off a node
POST /MAAS/api/2.0/rackcontrollers/{system_id}/op-power_on: Turn on a node
GET /MAAS/api/2.0/rackcontrollers/{system_id}/op-power_parameters: Get power parameters
GET /MAAS/api/2.0/rackcontrollers/{system_id}/op-query_power_state: Get the power state of a node
POST /MAAS/api/2.0/rackcontrollers/{system_id}/op-test: Begin testing process for a node
RegionControllers
GET /MAAS/api/2.0/regioncontrollers/: List Nodes visible to the user
GET /MAAS/api/2.0/regioncontrollers/op-is_registered: MAC address registered
POST /MAAS/api/2.0/regioncontrollers/op-set_zone: Assign nodes to a zone
RegionController
DELETE /MAAS/api/2.0/regioncontrollers/{system_id}/: Delete a region controller
GET /MAAS/api/2.0/regioncontrollers/{system_id}/: Read a node
PUT /MAAS/api/2.0/regioncontrollers/{system_id}/: Update a region controller
GET /MAAS/api/2.0/regioncontrollers/{system_id}/op-details: Get system details
GET /MAAS/api/2.0/regioncontrollers/{system_id}/op-power_parameters: Get power parameters
Reserved IPs
GET /MAAS/api/2.0/reservedips/: List all available Reserved IPs
POST /MAAS/api/2.0/reservedips/: Create a Reserved IP
Reserved IP
DELETE /MAAS/api/2.0/reservedips/{id}/: Delete a reserved IP
GET /MAAS/api/2.0/reservedips/{id}/: Read a Reserved IP
PUT /MAAS/api/2.0/reservedips/{id}/: Update a reserved IP
Resource pool
DELETE /MAAS/api/2.0/resourcepool/{id}/: ResourcePoolHandler delete
GET /MAAS/api/2.0/resourcepool/{id}/: ResourcePoolHandler read
PUT /MAAS/api/2.0/resourcepool/{id}/: ResourcePoolHandler update
Resource pools
GET /MAAS/api/2.0/resourcepools/: ResourcePoolsHandler read
POST /MAAS/api/2.0/resourcepools/: ResourcePoolsHandler create
Node Scripts
GET /MAAS/api/2.0/scripts/: List stored scripts
POST /MAAS/api/2.0/scripts/: Create a new script
Node Script
DELETE /MAAS/api/2.0/scripts/{name}: Delete a script
GET /MAAS/api/2.0/scripts/{name}: Return script metadata
PUT /MAAS/api/2.0/scripts/{name}: Update a script
POST /MAAS/api/2.0/scripts/{name}op-add_tag: Add a tag
GET /MAAS/api/2.0/scripts/{name}op-download: Download a script
POST /MAAS/api/2.0/scripts/{name}op-remove_tag: Remove a tag
POST /MAAS/api/2.0/scripts/{name}op-revert: Revert a script version
Spaces
GET /MAAS/api/2.0/spaces/: List all spaces
POST /MAAS/api/2.0/spaces/: Create a space
Space
DELETE /MAAS/api/2.0/spaces/{id}/: Delete a space
GET /MAAS/api/2.0/spaces/{id}/: Reads a space
PUT /MAAS/api/2.0/spaces/{id}/: Update space
Static routes
GET /MAAS/api/2.0/static-routes/: List static routes
POST /MAAS/api/2.0/static-routes/: Create a static route
Static route
DELETE /MAAS/api/2.0/static-routes/{id}/: Delete static route
GET /MAAS/api/2.0/static-routes/{id}/: Get a static route
PUT /MAAS/api/2.0/static-routes/{id}/: Update a static route
Subnets
GET /MAAS/api/2.0/subnets/: List all subnets
POST /MAAS/api/2.0/subnets/: Create a subnet
Subnet
DELETE /MAAS/api/2.0/subnets/{id}/: Delete a subnet
GET /MAAS/api/2.0/subnets/{id}/: Get a subnet
PUT /MAAS/api/2.0/subnets/{id}/: Update a subnet
GET /MAAS/api/2.0/subnets/{id}/op-ip_addresses: Summary of IP addresses
GET /MAAS/api/2.0/subnets/{id}/op-reserved_ip_ranges: List reserved IP ranges
GET /MAAS/api/2.0/subnets/{id}/op-statistics: Get subnet statistics
GET /MAAS/api/2.0/subnets/{id}/op-unreserved_ip_ranges: List unreserved IP ranges
Tags
GET /MAAS/api/2.0/tags/: List tags
POST /MAAS/api/2.0/tags/: Create a new tag
Tag
DELETE /MAAS/api/2.0/tags/{name}/: Delete a tag
GET /MAAS/api/2.0/tags/{name}/: Read a specific tag
PUT /MAAS/api/2.0/tags/{name}/: Update a tag
GET /MAAS/api/2.0/tags/{name}/op-devices: List devices by tag
GET /MAAS/api/2.0/tags/{name}/op-machines: List machines by tag
GET /MAAS/api/2.0/tags/{name}/op-nodes: List nodes by tag
GET /MAAS/api/2.0/tags/{name}/op-rack_controllers: List rack controllers by tag
POST /MAAS/api/2.0/tags/{name}/op-rebuild: Trigger a tag-node mapping rebuild
GET /MAAS/api/2.0/tags/{name}/op-region_controllers: List region controllers by tag
POST /MAAS/api/2.0/tags/{name}/op-update_nodes: Update nodes associated with this tag
Users
GET /MAAS/api/2.0/users/: List users
POST /MAAS/api/2.0/users/: Create a MAAS user account
GET /MAAS/api/2.0/users/op-whoami: Retrieve logged-in user
User
DELETE /MAAS/api/2.0/users/{username}/: Delete a user
GET /MAAS/api/2.0/users/{username}/: Retrieve user details
MAAS version
GET /MAAS/api/2.0/version/: MAAS version information
Virtual Machine Clusters
GET /MAAS/api/2.0/vm-clusters/: List VM Clusters
Virtual Machine Cluster
DELETE /MAAS/api/2.0/vm-clusters/{id}: Deletes a VM cluster
GET /MAAS/api/2.0/vm-clusters/{id}: VmClusterHandler read
PUT /MAAS/api/2.0/vm-clusters/{id}: Update VMCluster
Virtual machine hosts
GET /MAAS/api/2.0/vm-hosts/: List VM hosts
POST /MAAS/api/2.0/vm-hosts/: Create a VM host
Virtual machine host
DELETE /MAAS/api/2.0/vm-hosts/{id}/: Deletes a VM host
GET /MAAS/api/2.0/vm-hosts/{id}/: VmHostHandler read
PUT /MAAS/api/2.0/vm-hosts/{id}/: Update a specific VM host
POST /MAAS/api/2.0/vm-hosts/{id}/op-add_tag: Add a tag to a VM host
POST /MAAS/api/2.0/vm-hosts/{id}/op-compose: Compose a virtual machine on the host.
GET /MAAS/api/2.0/vm-hosts/{id}/op-parameters: Obtain VM host parameters
POST /MAAS/api/2.0/vm-hosts/{id}/op-refresh: Refresh a VM host
POST /MAAS/api/2.0/vm-hosts/{id}/op-remove_tag: Remove a tag from a VM host
Zones
GET /MAAS/api/2.0/zones/: ZonesHandler read
POST /MAAS/api/2.0/zones/: ZonesHandler create
Zone
DELETE /MAAS/api/2.0/zones/{name}/: ZoneHandler delete
GET /MAAS/api/2.0/zones/{name}/: ZoneHandler read
PUT /MAAS/api/2.0/zones/{name}/: ZoneHandler update
Power types
This is the list of the supported power types and their associated power parameters. Note that the list of usable power types for a particular rack controller might be a subset of this list if the rack controller in question is from an older version of MAAS.

amt (Intel AMT)
Power parameters:

power_pass (Power password).
power_address (Power address).
apc (American Power Conversion (APC) PDU)
Power parameters:

power_address (IP for APC PDU).
node_outlet (APC PDU node outlet number (1-16)).
power_on_delay (Power ON outlet delay (seconds)). Default: '5'.
pdu_type (PDU type). Choices: 'RPDU' (rPDU), 'MASTERSWITCH' (masterswitch) Default: 'RPDU'.
dli (Digital Loggers, Inc. PDU)
Power parameters:

outlet_id (Outlet ID).
power_address (Power address).
power_user (Power user).
power_pass (Power password).
eaton (Eaton PDU)
Power parameters:

power_address (IP for Eaton PDU).
node_outlet (Eaton PDU node outlet number (1-24)).
power_on_delay (Power ON outlet delay (seconds)). Default: '5'.
hmc (IBM Hardware Management Console (HMC) for PowerPC)
Power parameters:

power_address (IP for HMC).
power_user (HMC username).
power_pass (HMC password).
server_name (HMC Managed System server name).
lpar (HMC logical partition).
hmcz (IBM Hardware Management Console (HMC) for Z)
Power parameters:

power_address (HMC Address).
power_user (HMC username).
power_pass (HMC password).
power_partition_name (HMC partition name).
ipmi (IPMI)
Power parameters:

power_driver (Power driver). Choices: 'LAN' (LAN [IPMI 1.5]), 'LAN_2_0' (LAN_2_0 [IPMI 2.0]) Default: 'LAN_2_0'.
power_boot_type (Power boot type). Choices: 'auto' (Automatic), 'legacy' (Legacy boot), 'efi' (EFI boot) Default: 'auto'.
power_address (IP address).
power_user (Power user).
power_pass (Power password).
k_g (K_g BMC key).
cipher_suite_id (Cipher Suite ID). Choices: '17' (17 - HMAC-SHA256::HMAC_SHA256_128::AES-CBC-128), '3' (3 - HMAC-SHA1::HMAC-SHA1-96::AES-CBC-128), '' (freeipmi-tools default), '8' (8 - HMAC-MD5::HMAC-MD5-128::AES-CBC-128), '12' (12 - HMAC-MD5::MD5-128::AES-CBC-128) Default: '3'.
privilege_level (Privilege Level). Choices: 'USER' (User), 'OPERATOR' (Operator), 'ADMIN' (Administrator) Default: 'OPERATOR'.
workaround_flags (Workaround Flags). Choices: 'opensesspriv' (Opensesspriv), 'authcap' (Authcap), 'idzero' (Idzero), 'unexpectedauth' (Unexpectedauth), 'forcepermsg' (Forcepermsg), 'endianseq' (Endianseq), 'intel20' (Intel20), 'supermicro20' (Supermicro20), 'sun20' (Sun20), 'nochecksumcheck' (Nochecksumcheck), 'integritycheckvalue' (Integritycheckvalue), 'ipmiping' (Ipmiping), '' (None) Default: '['opensesspriv']'.
mac_address (Power MAC).
manual (Manual)
Power parameters:

moonshot (HP Moonshot - iLO4 (IPMI))
Power parameters:

power_address (Power address).
power_user (Power user).
power_pass (Power password).
power_hwaddress (Power hardware address).
mscm (HP Moonshot - iLO Chassis Manager)
Power parameters:

power_address (IP for MSCM CLI API).
power_user (MSCM CLI API user).
power_pass (MSCM CLI API password).
node_id (Node ID - Must adhere to cXnY format (X=cartridge number, Y=node number).).
msftocs (Microsoft OCS - Chassis Manager)
Power parameters:

power_address (Power address).
power_port (Power port).
power_user (Power user).
power_pass (Power password).
blade_id (Blade ID (Typically 1-24)).
nova (OpenStack Nova)
Power parameters:

nova_id (Host UUID).
os_tenantname (Tenant name).
os_username (Username).
os_password (Password).
os_authurl (Auth URL).
openbmc (OpenBMC Power Driver)
Power parameters:

power_address (OpenBMC address).
power_user (OpenBMC user).
power_pass (OpenBMC password).
proxmox (Proxmox)
Power parameters:

power_address (Proxmox host name or IP).
power_user (Proxmox username, including realm).
power_pass (Proxmox password, required if a token name and secret aren't given).
power_token_name (Proxmox API token name).
power_token_secret (Proxmox API token secret).
power_vm_name (Node ID).
power_verify_ssl (Verify SSL connections with system CA certificates). Choices: 'n' (No), 'y' (Yes) Default: 'n'.
recs_box (Christmann RECS|Box Power Driver)
Power parameters:

node_id (Node ID).
power_address (Power address).
power_port (Power port).
power_user (Power user).
power_pass (Power password).
redfish (Redfish)
Power parameters:

power_address (Redfish address).
power_user (Redfish user).
power_pass (Redfish password).
node_id (Node ID).
sm15k (SeaMicro 15000)
Power parameters:

system_id (System ID).
power_address (Power address).
power_user (Power user).
power_pass (Power password).
power_control (Power control type). Choices: 'ipmi' (IPMI), 'restapi' (REST API v0.9), 'restapi2' (REST API v2.0) Default: 'ipmi'.
ucsm (Cisco UCS Manager)
Power parameters:

uuid (Server UUID).
power_address (URL for XML API).
power_user (API user).
power_pass (API password).
vmware (VMware)
Power parameters:

power_vm_name (VM Name (if UUID unknown)).
power_uuid (VM UUID (if known)).
power_address (VMware IP).
power_user (VMware username).
power_pass (VMware password).
power_port (VMware API port (optional)).
power_protocol (VMware API protocol (optional)).
webhook (Webhook)
Power parameters:

power_on_uri (URI to power on the node).
power_off_uri (URI to power off the node).
power_query_uri (URI to query the nodes power status).
power_on_regex (Regex to confirm the node is on). Default: 'status.:.running'.
power_off_regex (Regex to confirm the node is off). Default: 'status.:.stopped'.
power_user (Power user).
power_pass (Power password).
power_token (Power token, will be used in place of power_user and power_pass).
power_verify_ssl (Verify SSL connections with system CA certificates). Choices: 'n' (No), 'y' (Yes) Default: 'n'.
wedge (Facebook's Wedge)
Power parameters:

power_address (IP address).
power_user (Power user).
power_pass (Power password).
lxd (LXD (virtual systems))
Power parameters:

power_address (LXD address).
instance_name (Instance name).
project (LXD project). Default: 'default'.
password (LXD password (optional)).
certificate (LXD certificate (optional)).
key (LXD private key (optional)).
virsh (Virsh (virtual systems))
Power parameters:

power_address (Address).
power_pass (Password (optional)).
power_id (Virsh VM ID).
Pod types
This is the list of the supported pod types and their associated parameters. Note that the list of usable pod types for a particular rack controller might be a subset of this list if the rack controller in question is from an older version of MAAS.

lxd (LXD (virtual systems))
Parameters:

power_address (LXD address).
instance_name (Instance name).
project (LXD project). Default: 'default'.
password (LXD password (optional)).
certificate (LXD certificate (optional)).
key (LXD private key (optional)).
virsh (Virsh (virtual systems))
Parameters:

power_address (Address).
power_pass (Password (optional)).
power_id (Virsh VM ID).
© 2025 Canonical Ltd.

MAAS
Home
Install MAAS
How it works
Tour
Docs
Tutorials
Contact us
Support
Need help?
Discourse
Commercial support
Contribute
Launchpad
Contribute to documentation
Ubuntu and Canonical are registered trademarks of Canonical Ltd.

Legal information  Manage your tracker settings  Report a bug on this site
Go to the top of the page
`

func main() {
	// Define command-line flags
	// inputFile := flag.String("input", "static_endpoints.json", "Path to the input file containing API endpoints") // Commented out as we use embedded text
	outputFile := flag.String("output", "parsed_maas_api_endpoints.json", "Path to the output file for parsed endpoints (optional)")
	toolsOutputFile := flag.String("tools-output", "generated_maas_tools.json", "Path to the output file for generated MCP tool definitions (optional)")
	filterTags := flag.String("tags", "", "Comma-separated list of tags to filter by (optional)")
	filterMethods := flag.String("methods", "", "Comma-separated list of HTTP methods to filter by (optional)")
	filterPathPrefix := flag.String("path-prefix", "", "Path prefix to filter by (optional)")
	verbose := flag.Bool("verbose", false, "Enable verbose logging")

	// Parse command-line flags
	flag.Parse()

	// Validate input file - Commented out as we use embedded text
	// if _, err := os.Stat(*inputFile); os.IsNotExist(err) {
	// 	log.Fatalf("Input file does not exist: %s", *inputFile)
	// }

	// Create parser using the embedded MAAS API documentation text
	docParser := parser.NewTextAPIDocumentationParser(maasApiDocumentationText)

	// Parse endpoints
	endpoints, err := docParser.Parse()
	if err != nil {
		log.Fatalf("Failed to parse endpoints: %v", err)
	}

	// Apply filters
	if *filterTags != "" {
		tags := strings.Split(*filterTags, ",")
		filter := parser.NewTagEndpointFilter(tags)
		endpoints = filter.Filter(endpoints)
	}

	if *filterMethods != "" {
		methods := strings.Split(*filterMethods, ",")
		httpMethods := make([]parser.HTTPMethod, 0, len(methods))
		for _, method := range methods {
			httpMethods = append(httpMethods, parser.HTTPMethod(strings.ToUpper(method)))
		}
		filter := parser.NewMethodEndpointFilter(httpMethods)
		endpoints = filter.Filter(endpoints)
	}

	if *filterPathPrefix != "" {
		filter := parser.NewPathEndpointFilter(*filterPathPrefix)
		endpoints = filter.Filter(endpoints)
	}

	// Print results
	if *verbose {
		fmt.Printf("Parsed %d endpoints:\n", len(endpoints))
		for i, endpoint := range endpoints {
			fmt.Printf("%d. %s %s\n", i+1, endpoint.Method, endpoint.Path)
			fmt.Printf("   Tool Name: %s\n", endpoint.GenerateToolName())
			fmt.Printf("   Description: %s\n", endpoint.GenerateDescription())
			fmt.Printf("   Parameters: %d\n", len(endpoint.Parameters))
			fmt.Printf("   Responses: %d\n", len(endpoint.Responses))
			fmt.Println()
		}
	} else {
		fmt.Printf("Parsed %d endpoints\n", len(endpoints))
	}

	// Write to output file if specified
	if *outputFile != "" {
		// Create directory if it doesn't exist
		dir := filepath.Dir(*outputFile)
		if _, err := os.Stat(dir); os.IsNotExist(err) {
			if err := os.MkdirAll(dir, 0755); err != nil {
				log.Fatalf("Failed to create directory: %v", err)
			}
		}

		// Write to file
		if err := parser.SaveEndpointsToFile(endpoints, *outputFile); err != nil {
			log.Fatalf("Failed to write to output file: %v", err)
		}

		fmt.Printf("Wrote endpoints to %s\n", *outputFile)
	}

	// Generate MCP tool definitions if requested
	if *toolsOutputFile != "" {
		// Create generator
		gen := generator.NewToolDefinitionGenerator(endpoints)

		// Generate tool definitions
		tools, err := gen.Generate()
		if err != nil {
			log.Fatalf("Failed to generate tool definitions: %v", err)
		}

		// Create directory if it doesn't exist
		dir := filepath.Dir(*toolsOutputFile)
		if _, err := os.Stat(dir); os.IsNotExist(err) {
			if err := os.MkdirAll(dir, 0755); err != nil {
				log.Fatalf("Failed to create directory: %v", err)
			}
		}

		// Write tool definitions to file
		if err := generator.SaveToolDefinitions(tools, *toolsOutputFile); err != nil {
			log.Fatalf("Failed to write tool definitions to file: %v", err)
		}

		fmt.Printf("Generated %d MCP tool definitions and wrote to %s\n", len(tools), *toolsOutputFile)
	}
}
