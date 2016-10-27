# nxfc_checkout

[![Join the chat at https://gitter.im/newcrossfoodcoop/nxfc](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/newcrossfoodcoop/nxfc?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

[![Build Status](http://drone.newcrossfoodcoop.org.uk/api/badges/newcrossfoodcoop/nxfc_checkout/status.svg)](http://drone.newcrossfoodcoop.org.uk/newcrossfoodcoop/nxfc_checkout)

This repository generates a container for checkout and order services accessed
via a trusted gateway.

## Provides

* **Express** api
 * [Documentation](http://localhost:3010)
 * [RAML specification](http://localhost:3010/api.raml)

This repository generates a container that **provides** checkout and order 
services intended to be accessed through a secured gateway.

## Depends

The services depend on:

* **Mongoose** to access mongodb
* **nxfc_catalogue** to verify products in orders
* **paypal-rest-sdk** to place orders via paypal

## Quick Start

Install docker and docker-compose, then:

```
$ docker-compose build
$ docker-compose up
```

## Tests

Install the drone CLI, then:

```
$ drone exec
```
